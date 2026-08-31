import { MessageSubcommand } from "@/classes/Command";
import {
  checkManageable,
  ensureGuild,
  guildOnlyReply,
  replyKey,
} from "./shared";
import { msToHuman, parseDuration } from "@/utils/duration";

export const tempSubcommand = new MessageSubcommand({
  name: "temp",
  description: "Temporarily add a role to a member for a duration.",
  aliases: ["temporary", "timed"],
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    { name: "member", type: "member", required: true, description: "Member." },
    {
      name: "duration",
      aliases: ["d", "time"],
      type: "string",
      required: true,
      description: "Duration (e.g. 1h, 30m, 1d).",
    },
    {
      name: "role",
      type: "role",
      required: true,
      description: "Role to apply.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const member = args.getMember("member");
    const durationStr = args.getString("duration");
    const role = args.getRole("role");
    if (!member || !durationStr || !role) return;

    const durationMs = parseDuration(durationStr);
    if (durationMs === null) {
      return replyKey(
        client,
        message,
        "warning",
        "commands.role.invalid_duration",
      );
    }

    const botCheck = await checkManageable(client, message, role);
    if (!botCheck.ok) {
      return replyKey(client, message, "warning", botCheck.key, botCheck.vars);
    }

    try {
      await member.roles.add(role, `Temp role by ${message.author.tag}`);
    } catch {
      return replyKey(client, message, "warning", "commands.role.failed");
    }

    const expiresAt = new Date(Date.now() + durationMs);
    await client.prisma.guild.upsert({
      where: { id: message.guildId! },
      update: {},
      create: { id: message.guildId! },
    });
    await client.prisma.temporaryRole.upsert({
      where: {
        guildId_userId_roleId: {
          guildId: message.guildId!,
          userId: member.id,
          roleId: role.id,
        },
      },
      update: { expiresAt },
      create: {
        guildId: message.guildId!,
        userId: member.id,
        roleId: role.id,
        expiresAt,
      },
    });

    await replyKey(client, message, "timeout", "commands.role.temp_added", {
      member: member.toString(),
      role: role.toString(),
      duration: msToHuman(durationMs),
    });
  },
});

export const untempSubcommand = new MessageSubcommand({
  name: "untemp",
  description: "Cancel a temporary role early.",
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    { name: "member", type: "member", required: true, description: "Member." },
    { name: "role", type: "role", required: true, description: "Role." },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const member = args.getMember("member");
    const role = args.getRole("role");
    if (!member || !role) return;

    await client.prisma.temporaryRole
      .delete({
        where: {
          guildId_userId_roleId: {
            guildId: message.guildId!,
            userId: member.id,
            roleId: role.id,
          },
        },
      })
      .catch(() => null);

    try {
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(
          role,
          `Cancel temp role by ${message.author.tag}`,
        );
      }
    } catch {
      // ignore
    }

    await replyKey(client, message, "Correct", "commands.role.temp_removed", {
      member: member.toString(),
      role: role.toString(),
    });
  },
});

export const stickyAddSubcommand = new MessageSubcommand({
  name: "sticky",
  description: "Mark a member's role as sticky (reapply on rejoin).",
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    { name: "member", type: "member", required: true, description: "Member." },
    {
      name: "role",
      type: "role",
      required: true,
      description: "Role to make sticky.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const member = args.getMember("member");
    const role = args.getRole("role");
    if (!member || !role) return;

    if (!member.roles.cache.has(role.id)) {
      try {
        await member.roles.add(role, `Sticky role by ${message.author.tag}`);
      } catch {
        return replyKey(client, message, "warning", "commands.role.failed");
      }
    }

    await client.prisma.guild.upsert({
      where: { id: message.guildId! },
      update: {},
      create: { id: message.guildId! },
    });
    await client.prisma.stickyRole.upsert({
      where: {
        guildId_userId_roleId: {
          guildId: message.guildId!,
          userId: member.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        guildId: message.guildId!,
        userId: member.id,
        roleId: role.id,
      },
    });

    await replyKey(
      client,
      message,
      "addreactions",
      "commands.role.sticky_added",
      {
        member: member.toString(),
        role: role.toString(),
      },
    );
  },
});

export const unstickySubcommand = new MessageSubcommand({
  name: "unsticky",
  description: "Remove a sticky role from a member.",
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    { name: "member", type: "member", required: true, description: "Member." },
    {
      name: "role",
      type: "role",
      required: true,
      description: "Role.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const member = args.getMember("member");
    const role = args.getRole("role");
    if (!member || !role) return;

    await client.prisma.stickyRole
      .delete({
        where: {
          guildId_userId_roleId: {
            guildId: message.guildId!,
            userId: member.id,
            roleId: role.id,
          },
        },
      })
      .catch(() => null);

    await replyKey(client, message, "Correct", "commands.role.sticky_removed", {
      member: member.toString(),
      role: role.toString(),
    });
  },
});
