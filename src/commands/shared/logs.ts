import {
  ChannelType,
  type Guild as DiscordGuild,
  type TextChannel,
  WebhookClient,
} from "discord.js";
import { LogCategory } from "@prisma/client";
import type Client from "@/classes/client";
import { ensureGuild } from "@/utils/guild";
import { findChannelLike, CHANNEL_LIKE_TYPES } from "@/utils/parser/Resolver";

export const LOG_CATEGORIES = [
  "channels",
  "guild",
  "images",
  "members",
  "messages",
  "moderation",
  "roles",
  "voice",
] as const;

export type LogCategoryKey = (typeof LOG_CATEGORIES)[number];

export function isLogCategory(value: string): value is LogCategoryKey {
  return (LOG_CATEGORIES as readonly string[]).includes(value.toLowerCase());
}

export function toEnumCategory(category: LogCategoryKey): LogCategory {
  return category.toUpperCase() as LogCategory;
}

async function createLogWebhook(
  channel: TextChannel,
  client: Client,
): Promise<{ id: string; token: string } | null> {
  try {
    const webhooks = await channel.fetchWebhooks();

    const existing = webhooks.find((webhook) => webhook.name === "Samy Logs");

    if (existing?.token) {
      return { id: existing.id, token: existing.token };
    }

    const webhook = await channel.createWebhook({
      name: "Samy Logs",
      avatar: client.user?.displayAvatarURL(),
    });

    return { id: webhook.id, token: webhook.token! };
  } catch (error) {
    client.logger.warn("Failed to create log webhook", {
      error,
      channel: channel.id,
    });

    return null;
  }
}

const DESTINATION_TYPES = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,
]);

export type ChannelResolveError = "not_found" | "invalid_type" | "forum_parent";

export interface ResolvedChannel {
  id: string;
  name: string;
  isThread: boolean;
  isForumParent: boolean;
  mention: string;
}

export async function resolveChannelLike(
  guild: DiscordGuild,
  raw: string,
  { strict }: { strict: boolean },
): Promise<
  | { ok: true; channel: ResolvedChannel }
  | { ok: false; error: ChannelResolveError }
> {
  const match = await findChannelLike(guild, raw, CHANNEL_LIKE_TYPES);

  if (match.status === "not_found") {
    return { ok: false, error: "not_found" };
  }

  if (match.status === "wrong_type") {
    return { ok: false, error: "invalid_type" };
  }

  const channel = match.channel;

  const isForumParent =
    channel.type === ChannelType.GuildForum ||
    channel.type === ChannelType.GuildMedia;

  if (strict && isForumParent) {
    return { ok: false, error: "forum_parent" };
  }

  const allowed = strict ? DESTINATION_TYPES : CHANNEL_LIKE_TYPES;
  if (!allowed.has(channel.type)) {
    return { ok: false, error: "invalid_type" };
  }

  return {
    ok: true,
    channel: {
      id: channel.id,
      name: channel.name ?? channel.id,
      isThread: channel.isThread(),
      isForumParent,
      mention: channel.toString(),
    },
  };
}

export async function setLogChannel(
  client: Client,
  guildId: string,
  category: LogCategoryKey,
  channelId: string,
) {
  await ensureGuild(guildId);

  let webhookId: string | undefined;
  let webhookToken: string | undefined;

  try {
    const channel = await client.channels.fetch(channelId);
    if (channel?.isTextBased() && !channel.isDMBased()) {
      const webhook = await createLogWebhook(channel as TextChannel, client);
      webhookId = webhook?.id;
      webhookToken = webhook?.token;
    }
  } catch (error) {
    client.logger.warn("Failed to create log webhook", { error });
  }

  try {
    await client.prisma.logChannel.upsert({
      where: {
        guildId_category: { guildId, category: toEnumCategory(category) },
      },
      update: { channelId, webhookId, webhookToken },
      create: {
        guildId,
        category: toEnumCategory(category),
        channelId,
        webhookId,
        webhookToken,
      },
    });
  } catch {
    await client.prisma.logChannel.upsert({
      where: {
        guildId_category: { guildId, category: toEnumCategory(category) },
      },
      update: { channelId },
      create: { guildId, category: toEnumCategory(category), channelId },
    });
  }
}

export async function setAllLogChannels(
  client: Client,
  guildId: string,
  channelId: string,
) {
  await ensureGuild(guildId);
  await Promise.all(
    LOG_CATEGORIES.map((category) =>
      setLogChannel(client, guildId, category, channelId),
    ),
  );
}

async function deleteLogWebhook(
  client: Client,
  webhookId: string | null | undefined,
  webhookToken: string | null | undefined,
) {
  if (!webhookId || !webhookToken) return;

  try {
    const webhook = new WebhookClient({ id: webhookId, token: webhookToken });

    await webhook.delete();

    client.logger.info("Deleted log webhook", { webhookId });
  } catch (error) {
    client.logger.warn("Failed to delete log webhook", {
      error,
      webhookId,
    });
  }
}

export async function removeLogChannel(
  client: Client,
  guildId: string,
  category: LogCategoryKey,
) {
  const logChannel = await client.prisma.logChannel.findUnique({
    where: {
      guildId_category: { guildId, category: toEnumCategory(category) },
    },
  });

  if (logChannel) {
    await deleteLogWebhook(
      client,
      logChannel.webhookId,
      logChannel.webhookToken,
    );
  }

  await client.prisma.logChannel
    .delete({
      where: {
        guildId_category: { guildId, category: toEnumCategory(category) },
      },
    })
    .catch(() => null);
}

export async function removeAllLogChannels(client: Client, guildId: string) {
  const logChannels = await client.prisma.logChannel.findMany({
    where: { guildId },
  });

  for (const logChannel of logChannels) {
    await deleteLogWebhook(
      client,
      logChannel.webhookId,
      logChannel.webhookToken,
    );
  }

  await client.prisma.logChannel.deleteMany({ where: { guildId } });
}

export async function listLogChannels(client: Client, guildId: string) {
  return client.prisma.logChannel.findMany({
    where: { guildId },
    orderBy: { category: "asc" },
  });
}

export type IgnoreTargetType = "USER" | "ROLE" | "CHANNEL";

export interface ResolvedTarget {
  id: string;
  type: IgnoreTargetType;
  display: string;
}

export async function resolveTarget(
  guild: DiscordGuild,
  raw: string,
): Promise<ResolvedTarget | null> {
  const id = raw.replace(/[<@&#!>]/g, "").trim();

  const channelResult = await resolveChannelLike(guild, raw, { strict: false });
  if (channelResult.ok) {
    return {
      id: channelResult.channel.id,
      type: "CHANNEL",
      display: channelResult.channel.mention,
    };
  }

  const role = guild.roles.cache.get(id);
  if (role) return { id: role.id, type: "ROLE", display: role.toString() };

  const member =
    guild.members.cache.get(id) ??
    (await guild.members.fetch(id).catch(() => null));
  if (member)
    return { id: member.id, type: "USER", display: member.toString() };

  return null;
}

export function mentionForTarget(target: {
  targetId: string;
  targetType: IgnoreTargetType;
}) {
  switch (target.targetType) {
    case "USER":
      return `<@${target.targetId}>`;
    case "ROLE":
      return `<@&${target.targetId}>`;
    case "CHANNEL":
      return `<#${target.targetId}>`;
  }
}

export async function addGlobalIgnore(
  client: Client,
  guildId: string,
  target: ResolvedTarget,
) {
  await ensureGuild(guildId);
  return client.prisma.logIgnore.upsert({
    where: {
      guildId_targetId_category: {
        guildId,
        targetId: target.id,
        category: LogCategory.ALL,
      },
    },
    update: {},
    create: {
      guildId,
      targetId: target.id,
      targetType: target.type,
      category: LogCategory.ALL,
    },
  });
}

export async function removeGlobalIgnore(
  client: Client,
  guildId: string,
  targetId: string,
) {
  return client.prisma.logIgnore
    .delete({
      where: {
        guildId_targetId_category: {
          guildId,
          targetId,
          category: LogCategory.ALL,
        },
      },
    })
    .catch(() => null);
}

export async function addTypeIgnore(
  client: Client,
  guildId: string,
  target: ResolvedTarget,
  category: LogCategoryKey,
) {
  await ensureGuild(guildId);
  return client.prisma.logIgnore.upsert({
    where: {
      guildId_targetId_category: {
        guildId,
        targetId: target.id,
        category: toEnumCategory(category),
      },
    },
    update: {},
    create: {
      guildId,
      targetId: target.id,
      targetType: target.type,
      category: toEnumCategory(category),
    },
  });
}

export async function removeTypeIgnore(
  client: Client,
  guildId: string,
  targetId: string,
  category: LogCategoryKey,
) {
  return client.prisma.logIgnore
    .delete({
      where: {
        guildId_targetId_category: {
          guildId,
          targetId,
          category: toEnumCategory(category),
        },
      },
    })
    .catch(() => null);
}
