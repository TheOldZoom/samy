import {
  CategoryChannel,
  ChannelType,
  GuildChannel,
  PermissionFlagsBits,
  type PermissionOverwriteOptions,
} from "discord.js";
import type Client from "@/classes/client";
import { Container, Text } from "@/ui/components";
import { MessageFlags } from "discord.js";

export const LOCKDOWN_PERMISSIONS = [
  "SendMessages",
  "AddReactions",
  "CreatePublicThreads",
  "CreatePrivateThreads",
] as const;

export const LOCKDOWN_FLAGS: bigint = LOCKDOWN_PERMISSIONS.reduce(
  (acc, name) => acc | PermissionFlagsBits[name],
  0n,
);

export function buildOverwriteOptions(
  newDeny: bigint,
  newAllow: bigint,
): PermissionOverwriteOptions {
  const options: PermissionOverwriteOptions = {};

  for (const name of LOCKDOWN_PERMISSIONS) {
    const bit = PermissionFlagsBits[name];

    if (newDeny & bit) {
      options[name] = false;
    } else if (newAllow & bit) {
      options[name] = true;
    } else {
      options[name] = null;
    }
  }

  return options;
}

export async function applyLockdownToChannel(
  channel: GuildChannel,
  targetId: string,
  lock: boolean,
  reason: string | undefined,
): Promise<void> {
  const overwrite = channel.permissionOverwrites.cache.get(targetId);

  const deny = overwrite ? overwrite.deny.bitfield : 0n;
  const allow = overwrite ? overwrite.allow.bitfield : 0n;

  let newDeny: bigint;
  let newAllow: bigint;

  if (lock) {
    newDeny = deny | LOCKDOWN_FLAGS;
    newAllow = allow & ~LOCKDOWN_FLAGS;
  } else {
    newDeny = deny & ~LOCKDOWN_FLAGS;
    newAllow = allow & ~LOCKDOWN_FLAGS;
  }

  if (newDeny === 0n && newAllow === 0n) {
    if (overwrite) {
      await channel.permissionOverwrites.delete(targetId, reason);
    }
  } else if (overwrite) {
    await channel.permissionOverwrites.edit(
      targetId,
      buildOverwriteOptions(newDeny, newAllow),
      { reason },
    );
  } else {
    await channel.permissionOverwrites.create(
      targetId,
      buildOverwriteOptions(newDeny, newAllow),
      { reason },
    );
  }
}

export async function toggleChannelOverwrites(
  channel: GuildChannel,
  everyoneId: string,
  roleIds: string[],
  lock: boolean,
  reason: string | undefined,
): Promise<void> {
  await applyLockdownToChannel(channel, everyoneId, lock, reason);

  for (const roleId of roleIds) {
    await applyLockdownToChannel(channel, roleId, lock, reason);
  }
}

export async function ensureBotCanAnnounce(
  channel: GuildChannel,
  botId: string,
  reason: string | undefined,
): Promise<void> {
  const me = channel.guild.members.me;

  if (me && channel.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages)) {
    return;
  }

  const overwrite = channel.permissionOverwrites.cache.get(botId);
  const deny = overwrite ? overwrite.deny.bitfield : 0n;
  const allow = overwrite ? overwrite.allow.bitfield : 0n;

  const sendBit = PermissionFlagsBits.SendMessages;

  if ((allow & sendBit) === sendBit && (deny & sendBit) === 0n) {
    return;
  }

  const options: PermissionOverwriteOptions = { SendMessages: true };

  if (overwrite) {
    await channel.permissionOverwrites.edit(botId, options, { reason });
  } else {
    await channel.permissionOverwrites.create(botId, options, { reason });
  }
}

export async function announceChannelState(
  client: Client,
  channel: GuildChannel,
  locked: boolean,
  reason: string | undefined,
): Promise<void> {
  if (!channel.isTextBased()) {
    return;
  }

  try {
    await channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            client.i18n.t(
              locked
                ? "commands.lockdown.channel_locked"
                : "commands.lockdown.channel_unlocked",
              {
                reason: reason ?? client.i18n.t("commands.lockdown.no_reason"),
              },
            ),
          ),
        ),
      ],
    });
  } catch {
    // ignore send errors
  }
}

export function isChannelLocked(
  channel: GuildChannel,
  everyoneId: string,
): boolean {
  const overwrite = channel.permissionOverwrites.cache.get(everyoneId);

  if (!overwrite) {
    return false;
  }

  const sendBit = PermissionFlagsBits.SendMessages;
  return (overwrite.deny.bitfield & sendBit) === sendBit;
}

export function isLockableChannel(channel: GuildChannel): boolean {
  return (
    channel.type !== ChannelType.GuildCategory &&
    channel.type !== ChannelType.GuildForum &&
    channel.type !== ChannelType.GuildMedia &&
    channel.isTextBased()
  );
}

export function resolveLockdownTargets(channel: GuildChannel): GuildChannel[] {
  if (channel instanceof CategoryChannel) {
    const children = channel.children.cache.filter(
      (child) => child instanceof GuildChannel && isLockableChannel(child),
    );

    return [...children.values()] as GuildChannel[];
  }

  return isLockableChannel(channel) ? [channel] : [];
}
