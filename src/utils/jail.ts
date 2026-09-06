import {
  ChannelType,
  MessageFlags,
  type Guild,
  type GuildMember,
  type GuildTextBasedChannel,
  type Role,
  type User,
} from "discord.js";
import prisma from "@/libs/prisma";
import type Client from "@/classes/client";
import { ensureGuild } from "@/utils/guild";
import { createModerationCase } from "@/utils/moderationCase";
import { deliverPunishmentDm } from "@/utils/invoke";
import { Container, Text } from "@/ui/components";
import { msToHuman } from "@/utils/duration";

const MAX_TIMER_MS = 2_147_000_000;
const jailTimers = new Map<string, ReturnType<typeof setTimeout>>();

function getJailKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

export function clearJailTimer(guildId: string, userId: string): void {
  const key = getJailKey(guildId, userId);
  const timer = jailTimers.get(key);
  if (!timer) return;
  clearTimeout(timer);
  jailTimers.delete(key);
}

export async function getJailConfig(guildId: string): Promise<{
  jailRoleId: string | null;
  jailChannelId: string | null;
}> {
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    select: { jailRoleId: true, jailChannelId: true },
  });

  return {
    jailRoleId: guild?.jailRoleId ?? null,
    jailChannelId: guild?.jailChannelId ?? null,
  };
}

export async function setJailRole(
  guildId: string,
  roleId: string,
): Promise<void> {
  await ensureGuild(guildId);
  await prisma.guild.update({
    where: { id: guildId },
    data: { jailRoleId: roleId },
  });
}

export async function setJailChannel(
  guildId: string,
  channelId: string,
): Promise<void> {
  await ensureGuild(guildId);
  await prisma.guild.update({
    where: { id: guildId },
    data: { jailChannelId: channelId },
  });
}

export async function ensureJailPermissions(
  guild: Guild,
  role: Role,
  channel: GuildTextBasedChannel,
  botMember: GuildMember,
): Promise<void> {
  await channel.permissionOverwrites
    .edit(
      guild.roles.everyone.id,
      { ViewChannel: false },
      { reason: "Jail channel setup: isolate from @everyone" },
    )
    .catch(() => null);

  await channel.permissionOverwrites
    .edit(
      role.id,
      { ViewChannel: true, SendMessages: true, ReadMessageHistory: true },
      { reason: "Jail channel setup: allow jailed role" },
    )
    .catch(() => null);

  await channel.permissionOverwrites
    .edit(
      botMember.id,
      {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        ManageChannels: true,
      },
      { reason: "Jail channel setup: allow bot" },
    )
    .catch(() => null);
}

export async function setupJail(
  guild: Guild,
  moderator: User,
  options?: { role?: Role; channel?: GuildTextBasedChannel },
): Promise<{ role: Role; channel: GuildTextBasedChannel }> {
  await ensureGuild(guild.id);
  const botMember = guild.members.me;
  if (!botMember) throw new Error("Bot member not found in guild");

  const config = await getJailConfig(guild.id);

  let role = options?.role;
  if (!role && config.jailRoleId) {
    role = guild.roles.cache.get(config.jailRoleId) ?? undefined;
  }
  if (!role) {
    role = await guild.roles.create({
      name: "Jailed",
      permissions: [],
      reason: `Jail system setup by ${moderator.tag}`,
    });
  }

  let channel = options?.channel;
  if (!channel && config.jailChannelId) {
    const found = guild.channels.cache.get(config.jailChannelId);
    if (found && found.isTextBased()) {
      channel = found as GuildTextBasedChannel;
    }
  }
  if (!channel) {
    const created = await guild.channels.create({
      name: "jail",
      type: ChannelType.GuildText,
      topic: "Jail room for restricted members.",
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: ["ViewChannel"],
        },
        {
          id: role.id,
          allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
        },
        {
          id: botMember.id,
          allow: [
            "ViewChannel",
            "SendMessages",
            "ReadMessageHistory",
            "ManageChannels",
          ],
        },
      ],
      reason: `Jail system setup by ${moderator.tag}`,
    });
    channel = created as GuildTextBasedChannel;
  }

  await ensureJailPermissions(guild, role, channel, botMember);

  for (const ch of guild.channels.cache.values()) {
    if (ch.id === channel.id) continue;
    if ("permissionOverwrites" in ch) {
      await ch.permissionOverwrites
        .edit(
          role.id,
          { ViewChannel: false, SendMessages: false },
          { reason: "Jail isolation" },
        )
        .catch(() => null);
    }
  }

  await prisma.guild.update({
    where: { id: guild.id },
    data: {
      jailRoleId: role.id,
      jailChannelId: channel.id,
    },
  });

  return { role, channel };
}

async function processJailExpiry(
  client: Client,
  guildId: string,
  userId: string,
): Promise<void> {
  const record = await prisma.jailedMember.findUnique({
    where: {
      guildId_userId: { guildId, userId },
    },
  });

  if (!record) {
    clearJailTimer(guildId, userId);
    return;
  }

  if (record.expiresAt && record.expiresAt.getTime() > Date.now()) {
    scheduleJail(client, record);
    return;
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    clearJailTimer(guildId, userId);
    return;
  }

  const botUser =
    client.user ?? (await client.users.fetch(client.user?.id ?? ""));
  await unjailMember({
    client,
    guild,
    userId,
    moderator: botUser,
    reason: "Jail duration expired",
  });
}

export function scheduleJail(
  client: Client,
  jailed: {
    guildId: string;
    userId: string;
    expiresAt: Date | null;
  },
): void {
  if (!jailed.expiresAt) return;

  const key = getJailKey(jailed.guildId, jailed.userId);
  clearJailTimer(jailed.guildId, jailed.userId);

  const remaining = jailed.expiresAt.getTime() - Date.now();
  if (remaining <= 0) {
    void processJailExpiry(client, jailed.guildId, jailed.userId);
    return;
  }

  const delay = Math.min(remaining, MAX_TIMER_MS);
  const timer = setTimeout(() => {
    jailTimers.delete(key);
    void processJailExpiry(client, jailed.guildId, jailed.userId);
  }, delay);

  jailTimers.set(key, timer);
}

export async function reconcileJails(client: Client): Promise<void> {
  const activeJails = await prisma.jailedMember.findMany({
    where: {
      expiresAt: { not: null },
    },
  });

  for (const jailed of activeJails) {
    scheduleJail(client, jailed);
  }
}

export async function unjailMember({
  client,
  guild,
  userId,
  moderator,
  reason,
}: {
  client: Client;
  guild: Guild;
  userId: string;
  moderator: User;
  reason?: string;
}): Promise<{ success: boolean; error?: string; restoredCount?: number }> {
  const jailed = await prisma.jailedMember.findUnique({
    where: {
      guildId_userId: {
        guildId: guild.id,
        userId,
      },
    },
  });

  if (!jailed) {
    return { success: false, error: "not_jailed" };
  }

  clearJailTimer(guild.id, userId);

  await prisma.jailedMember.delete({
    where: {
      guildId_userId: {
        guildId: guild.id,
        userId,
      },
    },
  });

  let previousRoleIds: string[] = [];
  try {
    previousRoleIds = JSON.parse(jailed.roles);
  } catch {
    previousRoleIds = [];
  }

  let restoredCount = 0;
  const targetUser = await client.users.fetch(userId).catch(() => null);
  const member = await guild.members.fetch(userId).catch(() => null);
  const botMember = guild.members.me;

  if (member && botMember) {
    const jailConfig = await getJailConfig(guild.id);
    const jailRoleId = jailConfig.jailRoleId;

    const validRolesToRestore = previousRoleIds.filter((id) => {
      const r = guild.roles.cache.get(id);
      return (
        r &&
        r.id !== guild.id &&
        !r.managed &&
        r.id !== jailRoleId &&
        r.position < botMember.roles.highest.position
      );
    });

    try {
      await member.roles.set(
        validRolesToRestore,
        `Unjailed by ${moderator.tag}: ${reason || "No reason provided."}`,
      );
      restoredCount = validRolesToRestore.length;
    } catch {
      if (jailRoleId && member.roles.cache.has(jailRoleId)) {
        await member.roles.remove(jailRoleId).catch(() => null);
      }
    }
  }

  const effectiveReason = reason || "No reason provided.";
  const caseNumber = await createModerationCase({
    guildId: guild.id,
    type: "unjail",
    userId,
    moderatorId: moderator.id,
    reason: effectiveReason,
  });

  if (targetUser) {
    await deliverPunishmentDm({
      guild,
      target: targetUser,
      action: "unjail",
      moderator,
      reason: effectiveReason,
      caseNumber,
      fallback: async () => {
        await targetUser.send({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                client.i18n.t("commands.unjail.dm", {
                  guild: guild.name,
                  reason: effectiveReason,
                }),
              ),
            ),
          ],
        });
      },
    });
  }

  return { success: true, restoredCount };
}
