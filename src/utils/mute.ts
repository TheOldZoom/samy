import { MessageFlags, type Guild, type Role, type User } from "discord.js";
import prisma from "@/libs/prisma";
import type Client from "@/classes/client";
import { ensureGuild } from "@/utils/guild";
import { createModerationCase } from "@/utils/moderationCase";
import { deliverPunishmentDm } from "@/utils/invoke";
import { Container, Text } from "@/ui/components";

const MAX_TIMER_MS = 2_147_000_000;
const muteTimers = new Map<string, ReturnType<typeof setTimeout>>();

export type MuteType = "image" | "reaction";

function getMuteKey(guildId: string, userId: string, type: MuteType): string {
  return `${guildId}:${userId}:${type}`;
}

export function clearTemporaryMuteTimer(
  guildId: string,
  userId: string,
  type: MuteType,
): void {
  const key = getMuteKey(guildId, userId, type);
  const timer = muteTimers.get(key);
  if (!timer) return;
  clearTimeout(timer);
  muteTimers.delete(key);
}

export async function ensureImageMuteRole(
  guild: Guild,
  moderator: User,
  specifiedRole?: Role,
): Promise<Role> {
  await ensureGuild(guild.id);
  const dbGuild = await prisma.guild.findUnique({
    where: { id: guild.id },
    select: { imageMuteRoleId: true },
  });

  if (specifiedRole) {
    await configureImageMuteChannelOverwrites(guild, specifiedRole);
    await prisma.guild.update({
      where: { id: guild.id },
      data: { imageMuteRoleId: specifiedRole.id },
    });
    return specifiedRole;
  }

  if (dbGuild?.imageMuteRoleId) {
    const existing = guild.roles.cache.get(dbGuild.imageMuteRoleId);
    if (existing) return existing;
  }

  const found = guild.roles.cache.find(
    (r) =>
      r.name.toLowerCase() === "image muted" ||
      r.name.toLowerCase() === "imuted",
  );
  if (found) {
    await configureImageMuteChannelOverwrites(guild, found);
    await prisma.guild.update({
      where: { id: guild.id },
      data: { imageMuteRoleId: found.id },
    });
    return found;
  }

  const created = await guild.roles.create({
    name: "Image Muted",
    permissions: [],
    reason: `Auto-created image mute role by ${moderator.tag}`,
  });

  await configureImageMuteChannelOverwrites(guild, created);
  await prisma.guild.update({
    where: { id: guild.id },
    data: { imageMuteRoleId: created.id },
  });

  return created;
}

export async function configureImageMuteChannelOverwrites(
  guild: Guild,
  role: Role,
): Promise<void> {
  for (const ch of guild.channels.cache.values()) {
    if (ch.isTextBased() && "permissionOverwrites" in ch) {
      await ch.permissionOverwrites
        .edit(
          role.id,
          {
            AttachFiles: false,
            EmbedLinks: false,
          },
          { reason: "Image mute channel permission isolation" },
        )
        .catch(() => null);
    }
  }
}

export async function ensureReactionMuteRole(
  guild: Guild,
  moderator: User,
  specifiedRole?: Role,
): Promise<Role> {
  await ensureGuild(guild.id);
  const dbGuild = await prisma.guild.findUnique({
    where: { id: guild.id },
    select: { reactionMuteRoleId: true },
  });

  if (specifiedRole) {
    await configureReactionMuteChannelOverwrites(guild, specifiedRole);
    await prisma.guild.update({
      where: { id: guild.id },
      data: { reactionMuteRoleId: specifiedRole.id },
    });
    return specifiedRole;
  }

  if (dbGuild?.reactionMuteRoleId) {
    const existing = guild.roles.cache.get(dbGuild.reactionMuteRoleId);
    if (existing) return existing;
  }

  const found = guild.roles.cache.find(
    (r) =>
      r.name.toLowerCase() === "reaction muted" ||
      r.name.toLowerCase() === "rmuted",
  );
  if (found) {
    await configureReactionMuteChannelOverwrites(guild, found);
    await prisma.guild.update({
      where: { id: guild.id },
      data: { reactionMuteRoleId: found.id },
    });
    return found;
  }

  const created = await guild.roles.create({
    name: "Reaction Muted",
    permissions: [],
    reason: `Auto-created reaction mute role by ${moderator.tag}`,
  });

  await configureReactionMuteChannelOverwrites(guild, created);
  await prisma.guild.update({
    where: { id: guild.id },
    data: { reactionMuteRoleId: created.id },
  });

  return created;
}

export async function configureReactionMuteChannelOverwrites(
  guild: Guild,
  role: Role,
): Promise<void> {
  for (const ch of guild.channels.cache.values()) {
    if (ch.isTextBased() && "permissionOverwrites" in ch) {
      await ch.permissionOverwrites
        .edit(
          role.id,
          {
            AddReactions: false,
            UseExternalEmojis: false,
            UseExternalStickers: false,
          },
          { reason: "Reaction mute channel permission isolation" },
        )
        .catch(() => null);
    }
  }
}

async function processMuteExpiry(
  client: Client,
  guildId: string,
  userId: string,
  type: MuteType,
): Promise<void> {
  const record = await prisma.temporaryMute.findUnique({
    where: {
      guildId_userId_type: { guildId, userId, type },
    },
  });

  if (!record) {
    clearTemporaryMuteTimer(guildId, userId, type);
    return;
  }

  if (record.expiresAt.getTime() > Date.now()) {
    scheduleTemporaryMute(
      client,
      record as {
        guildId: string;
        userId: string;
        type: MuteType;
        expiresAt: Date;
        roleId: string;
      },
    );
    return;
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    clearTemporaryMuteTimer(guildId, userId, type);
    return;
  }

  const botUser =
    client.user ??
    (await client.users.fetch((client.user?.id ?? "") as string));
  await removeMute({
    client,
    guild,
    userId,
    type,
    moderator: botUser,
    reason: `${type === "image" ? "Image" : "Reaction"} mute duration expired`,
  });
}

export function scheduleTemporaryMute(
  client: Client,
  mute: {
    guildId: string;
    userId: string;
    type: MuteType;
    expiresAt: Date;
    roleId: string;
  },
): void {
  const key = getMuteKey(mute.guildId, mute.userId, mute.type);
  clearTemporaryMuteTimer(mute.guildId, mute.userId, mute.type);

  const remaining = mute.expiresAt.getTime() - Date.now();
  if (remaining <= 0) {
    void processMuteExpiry(client, mute.guildId, mute.userId, mute.type);
    return;
  }

  const delay = Math.min(remaining, MAX_TIMER_MS);
  const timer = setTimeout(() => {
    muteTimers.delete(key);
    void processMuteExpiry(client, mute.guildId, mute.userId, mute.type);
  }, delay);

  muteTimers.set(key, timer);
}

export async function reconcileTemporaryMutes(client: Client): Promise<void> {
  const activeMutes = await prisma.temporaryMute.findMany();
  for (const mute of activeMutes) {
    scheduleTemporaryMute(
      client,
      mute as {
        guildId: string;
        userId: string;
        type: MuteType;
        expiresAt: Date;
        roleId: string;
      },
    );
  }
}

export async function removeMute({
  client,
  guild,
  userId,
  type,
  moderator,
  reason,
}: {
  client: Client;
  guild: Guild;
  userId: string;
  type: MuteType;
  moderator: User;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  clearTemporaryMuteTimer(guild.id, userId, type);

  await prisma.temporaryMute.deleteMany({
    where: {
      guildId: guild.id,
      userId,
      type,
    },
  });

  const dbGuild = await prisma.guild.findUnique({
    where: { id: guild.id },
    select: { imageMuteRoleId: true, reactionMuteRoleId: true },
  });

  const roleId =
    type === "image" ? dbGuild?.imageMuteRoleId : dbGuild?.reactionMuteRoleId;

  const member = await guild.members.fetch(userId).catch(() => null);
  if (member && roleId && member.roles.cache.has(roleId)) {
    await member.roles
      .remove(
        roleId,
        `Unmuted (${type}) by ${moderator.tag}: ${reason || "No reason provided."}`,
      )
      .catch(() => null);
  }

  const actionName = type === "image" ? "iunmute" : "runmute";
  const effectiveReason = reason || "No reason provided.";

  const caseNumber = await createModerationCase({
    guildId: guild.id,
    type: actionName,
    userId,
    moderatorId: moderator.id,
    reason: effectiveReason,
  });

  const targetUser = await client.users.fetch(userId).catch(() => null);
  if (targetUser) {
    await deliverPunishmentDm({
      guild,
      target: targetUser,
      action: actionName,
      moderator,
      reason: effectiveReason,
      caseNumber,
      fallback: async () => {
        await targetUser.send({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                client.i18n.t(`commands.${actionName}.dm`, {
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

  return { success: true };
}
