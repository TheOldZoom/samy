import type Client from "@/classes/client";
import type {
  CommandAlias,
  CommandRestriction,
  ChannelCommandSetting,
  MemberCommandSetting,
  FakePermission,
} from "@prisma/client";
import prisma from "@/libs/prisma";
import { ensureGuild } from "@/utils/guild";

export type SettingsGuildId = string;
export type SettingsChannelId = string;
export type SettingsUserId = string;
export type SettingsCommandName = string;
export type SettingsEventName = string;
export type SettingsPermission = string;
export type SettingsRoleId = string;

export async function getGuildPrefix(
  guildId: string,
  client: Client,
): Promise<string | null> {
  if (client) {
    const cached = client.guildPrefixes.get(guildId);
    if (cached !== undefined) return cached;
  }

  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    select: { prefix: true },
  });

  const value = guild?.prefix ?? null;

  if (client) {
    client.guildPrefixes.set(guildId, value);
  }

  return value;
}

export async function getUserPrefix(
  userId: string,
  client: Client,
): Promise<string | null> {
  if (client) {
    const cached = client.userPrefixes.get(userId);
    if (cached !== undefined) return cached;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { prefix: true },
  });

  const value = user?.prefix ?? null;

  if (client) {
    client.userPrefixes.set(userId, value);
  }

  return value;
}

export async function getEffectivePrefix(
  guildId: string,
  userId: string,
  client: Client,
): Promise<string> {
  const userPrefix = await getUserPrefix(userId, client);

  if (userPrefix) return userPrefix;

  const guildPrefix = await getGuildPrefix(guildId, client);

  if (guildPrefix) return guildPrefix;

  return client?.prefix;
}

export async function getAlias(
  guildId: string,
  alias: string,
  client?: Client,
): Promise<string | null> {
  if (client) {
    const cached = client.aliases.get(guildId);

    if (cached) {
      const found = cached.find((a) => a.alias === alias.toLowerCase());

      if (found) return found.command;
    }
  }

  const aliasRecord = await prisma.commandAlias.findUnique({
    where: {
      guildId_alias: {
        guildId,
        alias: alias.toLowerCase(),
      },
    },
    select: {
      command: true,
    },
  });

  const value = aliasRecord?.command ?? null;

  return value;
}

export async function getAliases(
  guildId: string,
  client?: Client,
): Promise<CommandAlias[]> {
  if (client) {
    const cached = client.aliases.get(guildId);

    if (cached) return cached;
  }

  const aliases = await prisma.commandAlias.findMany({
    where: {
      guildId,
    },
    orderBy: {
      alias: "asc",
    },
  });

  if (client) {
    client.aliases.set(guildId, aliases);
  }

  return aliases;
}

export function resolveAlias(
  template: string,
  args: string[],
): {
  commandName: string;
  args: string[];
} {
  if (!template.includes("$")) {
    const parts = template.trim().split(/\s+/);

    return {
      commandName: parts[0]?.toLowerCase() ?? "",
      args: parts.slice(1),
    };
  }

  let resolved = template;

  resolved = resolved.replace(/\$\*/g, args.join(" "));

  for (let i = 0; i < args.length; i++) {
    const value = args[i]!;

    resolved = resolved.replace(new RegExp(`\\$${i + 1}`, "g"), () => value);
  }

  resolved = resolved.replace(/\$\d+/g, "");

  const parts = resolved.trim().split(/\s+/).filter(Boolean);

  const commandName = parts.shift()?.toLowerCase() ?? "";

  const newArgs = parts;

  return {
    commandName,
    args: newArgs,
  };
}

export async function addAlias(
  guildId: string,
  alias: string,
  command: string,
  client?: Client,
): Promise<CommandAlias> {
  await ensureGuild(guildId);

  const result = await prisma.commandAlias.create({
    data: {
      guildId,
      alias: alias.toLowerCase(),
      command: command.toLowerCase(),
    },
  });

  if (client) {
    const existing = client.aliases.get(guildId) ?? [];

    existing.push(result);

    client.aliases.set(guildId, existing);
  }

  return result;
}

export async function removeAlias(
  guildId: string,
  alias: string,
  client?: Client,
): Promise<boolean> {
  const result = await prisma.commandAlias.deleteMany({
    where: {
      guildId,
      alias: alias.toLowerCase(),
    },
  });

  if (result.count > 0 && client) {
    const existing = client.aliases.get(guildId);

    if (existing) {
      client.aliases.set(
        guildId,
        existing.filter((a) => a.alias !== alias.toLowerCase()),
      );
    }
  }

  return result.count > 0;
}

export async function isCommandRestricted(
  guildId: string,
  command: string,
  client?: Client,
): Promise<CommandRestriction[]> {
  const commandName = command.trim().toLowerCase();

  const restrictions = await getAllCommandRestrictions(guildId, client);

  return restrictions.filter(
    (restriction) => restriction.command.toLowerCase() === commandName,
  );
}

export async function getAllCommandRestrictions(
  guildId: string,
  client?: Client,
): Promise<CommandRestriction[]> {
  if (client) {
    const cached = client.restrictions.get(guildId);

    if (cached !== undefined) {
      return cached;
    }
  }

  const restrictions = await prisma.commandRestriction.findMany({
    where: {
      guildId,
    },
    orderBy: {
      command: "asc",
    },
  });

  if (client) {
    client.restrictions.set(guildId, restrictions);
  }

  return restrictions;
}

export async function addCommandRestriction(
  guildId: string,
  command: string,
  roleId: string,
  client?: Client,
): Promise<CommandRestriction> {
  await ensureGuild(guildId);

  const commandName = command.trim().toLowerCase();

  const result = await prisma.commandRestriction.create({
    data: {
      guildId,
      command: commandName,
      roleId,
    },
  });

  if (client) {
    const cached = client.restrictions.get(guildId);

    if (cached !== undefined) {
      cached.push(result);

      client.restrictions.set(guildId, cached);
    }
  }

  return result;
}

export async function removeCommandRestriction(
  guildId: string,
  command: string,
  roleId: string,
  client?: Client,
): Promise<boolean> {
  const commandName = command.trim().toLowerCase();

  const result = await prisma.commandRestriction.deleteMany({
    where: {
      guildId,
      command: commandName,
      roleId,
    },
  });

  if (result.count > 0 && client) {
    const cached = client.restrictions.get(guildId);

    if (cached !== undefined) {
      client.restrictions.set(
        guildId,
        cached.filter(
          (restriction) =>
            !(
              restriction.command === commandName &&
              restriction.roleId === roleId
            ),
        ),
      );
    }
  }

  return result.count > 0;
}

export async function clearCommandRestrictions(
  guildId: string,
  command: string,
  client?: Client,
): Promise<number> {
  const commandName = command.trim().toLowerCase();

  const result = await prisma.commandRestriction.deleteMany({
    where: {
      guildId,
      command: commandName,
    },
  });

  if (result.count > 0 && client) {
    const cached = client.restrictions.get(guildId);

    if (cached !== undefined) {
      client.restrictions.set(
        guildId,
        cached.filter((restriction) => restriction.command !== commandName),
      );
    }
  }

  return result.count;
}

export async function getChannelCommandSetting(
  guildId: string,
  channelId: string,
  command: string,
  client?: Client,
): Promise<ChannelCommandSetting | null> {
  if (client) {
    const cached = client.channelSettings.get(`${guildId}:${channelId}`);

    if (cached) {
      const found = cached.find((s) => s.command === command.toLowerCase());

      if (found) return found;
    }
  }

  const setting = await prisma.channelCommandSetting.findUnique({
    where: {
      guildId_channelId_command: {
        guildId,
        channelId,
        command: command.toLowerCase(),
      },
    },
  });

  return setting;
}

export async function setChannelCommandEnabled(
  guildId: string,
  channelId: string,
  command: string,
  enabled: boolean,
  client?: Client,
): Promise<ChannelCommandSetting> {
  await ensureGuild(guildId);

  const result = await prisma.channelCommandSetting.upsert({
    where: {
      guildId_channelId_command: {
        guildId,
        channelId,
        command: command.toLowerCase(),
      },
    },
    create: {
      guildId,
      channelId,
      command: command.toLowerCase(),
      enabled,
    },
    update: {
      enabled,
      updatedAt: new Date(),
    },
  });

  if (client) {
    const key = `${guildId}:${channelId}`;

    const existing = client.channelSettings.get(key) ?? [];

    const idx = existing.findIndex((s) => s.command === command.toLowerCase());

    if (idx >= 0) {
      existing[idx] = result;
    } else {
      existing.push(result);
    }

    client.channelSettings.set(key, existing);
  }

  return result;
}

export async function getChannelCommandSettings(
  guildId: string,
  channelId: string,
  client?: Client,
): Promise<ChannelCommandSetting[]> {
  if (client) {
    const cached = client.channelSettings.get(`${guildId}:${channelId}`);

    if (cached) return cached;
  }

  const settings = await prisma.channelCommandSetting.findMany({
    where: {
      guildId,
      channelId,
    },
  });

  if (client) {
    client.channelSettings.set(`${guildId}:${channelId}`, settings);
  }

  return settings;
}

export async function getMemberCommandSetting(
  guildId: string,
  userId: string,
  command: string,
  client?: Client,
): Promise<MemberCommandSetting | null> {
  if (client) {
    const cached = client.memberSettings.get(`${guildId}:${userId}`);

    if (cached) {
      const found = cached.find((s) => s.command === command.toLowerCase());

      if (found) return found;
    }
  }

  const setting = await prisma.memberCommandSetting.findUnique({
    where: {
      guildId_userId_command: {
        guildId,
        userId,
        command: command.toLowerCase(),
      },
    },
  });

  return setting;
}

export async function setMemberCommandEnabled(
  guildId: string,
  userId: string,
  command: string,
  enabled: boolean,
  client?: Client,
): Promise<MemberCommandSetting> {
  await ensureGuild(guildId);

  const result = await prisma.memberCommandSetting.upsert({
    where: {
      guildId_userId_command: {
        guildId,
        userId,
        command: command.toLowerCase(),
      },
    },
    create: {
      guildId,
      userId,
      command: command.toLowerCase(),
      enabled,
    },
    update: {
      enabled,
      updatedAt: new Date(),
    },
  });

  if (client) {
    const key = `${guildId}:${userId}`;

    const existing = client.memberSettings.get(key) ?? [];

    const idx = existing.findIndex((s) => s.command === command.toLowerCase());

    if (idx >= 0) {
      existing[idx] = result;
    } else {
      existing.push(result);
    }

    client.memberSettings.set(key, existing);
  }

  return result;
}

export async function getMemberCommandSettings(
  guildId: string,
  userId: string,
  client?: Client,
): Promise<MemberCommandSetting[]> {
  if (client) {
    const cached = client.memberSettings.get(`${guildId}:${userId}`);

    if (cached) return cached;
  }

  const settings = await prisma.memberCommandSetting.findMany({
    where: {
      guildId,
      userId,
    },
  });

  if (client) {
    client.memberSettings.set(`${guildId}:${userId}`, settings);
  }

  return settings;
}

export async function isCommandEnabledForGuild(
  guildId: string,
  command: string,
  client?: Client,
): Promise<boolean> {
  if (client) {
    const cached = client.commandSettings.get(
      `${guildId}:${command.toLowerCase()}`,
    );

    if (cached !== undefined) return cached;
  }

  const setting = await prisma.commandSetting.findUnique({
    where: {
      guildId_command: {
        guildId,
        command: command.toLowerCase(),
      },
    },
  });

  const value = setting?.enabled ?? true;

  if (client) {
    client.commandSettings.set(`${guildId}:${command.toLowerCase()}`, value);
  }

  return value;
}

export async function setCommandEnabledForGuild(
  guildId: string,
  command: string,
  enabled: boolean,
  client?: Client,
): Promise<void> {
  await ensureGuild(guildId);

  await prisma.commandSetting.upsert({
    where: {
      guildId_command: {
        guildId,
        command: command.toLowerCase(),
      },
    },
    create: {
      guildId,
      command: command.toLowerCase(),
      enabled,
    },
    update: {
      enabled,
    },
  });

  if (client) {
    client.commandSettings.set(`${guildId}:${command.toLowerCase()}`, enabled);
  }
}

export async function isCommandEnabledForChannel(
  guildId: string,
  channelId: string,
  command: string,
  client?: Client,
): Promise<boolean> {
  const setting = await getChannelCommandSetting(
    guildId,
    channelId,
    command,
    client,
  );

  return setting?.enabled ?? true;
}

export async function isCommandEnabledForMember(
  guildId: string,
  userId: string,
  command: string,
  client?: Client,
): Promise<boolean> {
  const setting = await getMemberCommandSetting(
    guildId,
    userId,
    command,
    client,
  );

  return setting?.enabled ?? true;
}

export async function isCommandEnabled(
  guildId: string,
  command: string,
  channelId: string,
  userId: string,
  client?: Client,
): Promise<boolean> {
  const guildEnabled = await isCommandEnabledForGuild(guildId, command, client);

  if (!guildEnabled) return false;

  const channelEnabled = await isCommandEnabledForChannel(
    guildId,
    channelId,
    command,
    client,
  );

  if (!channelEnabled) return false;

  const memberEnabled = await isCommandEnabledForMember(
    guildId,
    userId,
    command,
    client,
  );

  if (!memberEnabled) return false;

  return true;
}

export async function getAllFakePermissions(
  guildId: string,
  client?: Client,
): Promise<FakePermission[]> {
  if (client) {
    const cached = client.fakePermissions.get(guildId);

    if (cached) return cached;
  }

  const permissions = await prisma.fakePermission.findMany({
    where: {
      guildId,
    },
    orderBy: {
      permission: "asc",
    },
  });

  if (client) {
    client.fakePermissions.set(guildId, permissions);
  }

  return permissions;
}

export async function hasFakePermission(
  guildId: string,
  userId: string,
  permission: string,
  memberRoles: string[],
  client?: Client,
): Promise<boolean> {
  const allFakePermissions = await getAllFakePermissions(guildId, client);

  const normalizedPermission = permission.trim().toLowerCase();

  return allFakePermissions.some(
    (fp) =>
      fp.permission.toLowerCase() === normalizedPermission &&
      memberRoles.includes(fp.roleId),
  );
}

export async function hasFakeAdministratorPermission(
  guildId: string,
  userId: string,
  memberRoles: string[],
  client?: Client,
): Promise<boolean> {
  return hasFakePermission(
    guildId,
    userId,
    "administrator",
    memberRoles,
    client,
  );
}

export async function addFakePermission(
  guildId: string,
  roleId: string,
  permission: string,
  client?: Client,
): Promise<FakePermission> {
  await ensureGuild(guildId);

  const result = await prisma.fakePermission.create({
    data: {
      guildId,
      roleId,
      permission: permission.toLowerCase(),
    },
  });

  if (client) {
    client.fakePermissions.delete(guildId);
  }

  return result;
}

export async function removeFakePermission(
  guildId: string,
  roleId: string,
  permission: string,
  client?: Client,
): Promise<boolean> {
  const result = await prisma.fakePermission.deleteMany({
    where: {
      guildId,
      roleId,
      permission: permission.toLowerCase(),
    },
  });

  if (result.count > 0 && client) {
    client.fakePermissions.delete(guildId);
  }

  return result.count > 0;
}

export async function getFakePermissions(
  guildId: string,
  roleId: string,
  client?: Client,
): Promise<FakePermission[]> {
  const allFakePermissions = await getAllFakePermissions(guildId, client);

  return allFakePermissions.filter((fp) => fp.roleId === roleId);
}

export async function getChannelDisabledCommands(
  guildId: string,
  channelId: string,
  client?: Client,
): Promise<string[]> {
  const settings = await getChannelCommandSettings(guildId, channelId, client);

  return settings.filter((s) => !s.enabled).map((s) => s.command);
}

export async function getCommandSettingsForGuild(
  guildId: string,
  client?: Client,
): Promise<ChannelCommandSetting[]> {
  if (client) {
    const cached = client.channelSettings.get(`all:${guildId}`);

    if (cached) return cached;
  }

  const settings = await prisma.channelCommandSetting.findMany({
    where: {
      guildId,
    },
    orderBy: {
      channelId: "asc",
    },
  });

  if (client) {
    client.channelSettings.set(`all:${guildId}`, settings);
  }

  return settings;
}
