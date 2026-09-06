import { MessageSubcommand } from "@/classes/Command";
import {
  checkManageable,
  ensureGuild,
  guildOnlyReply,
  replyKey,
} from "./shared";

export const allSubcommand = new MessageSubcommand({
  name: "all",
  description: "List the most populated roles in the server.",
  async execute(client, message) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    await message.guild.members.fetch().catch(() => null);

    const roles = [...message.guild.roles.cache.values()]
      .filter((r) => r.id !== message.guild.roles.everyone.id)
      .sort((a, b) => b.members.size - a.members.size)
      .slice(0, 25);

    if (roles.length === 0) {
      return replyKey(client, message, "roles", "commands.role.all_empty");
    }

    const lines = roles
      .map((r) => `${r.toString()} - **${r.members.size}** members`)
      .join("\n");

    await replyKey(client, message, "roles", "commands.role.all_list", {
      roles: lines,
    });
  },
});

export const allAddSubcommand = new MessageSubcommand({
  name: "addall",
  description: "Add a role to all members of a type (humans/bots/members).",
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    {
      name: "type",
      aliases: ["t"],
      type: "string",
      required: true,
      description: "humans, bots, or members.",
    },
    {
      name: "role",
      aliases: ["r"],
      type: "role",
      required: true,
      description: "The role to add.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const type = (args.getString("type") ?? "").toLowerCase();
    const role = args.getRole("role");
    if (!role) return;

    if (!["humans", "bots", "members"].includes(type)) {
      return replyKey(client, message, "warning", "commands.role.invalid_type");
    }

    const botCheck = checkManageable(client, message, role);
    if (!botCheck.ok) {
      return replyKey(client, message, "warning", botCheck.key, botCheck.vars);
    }

    await message.guild.members.fetch().catch(() => null);
    const members = message.guild.members.cache.filter((m) => {
      if (type === "humans") return !m.user.bot;
      if (type === "bots") return m.user.bot;
      return true;
    });

    let added = 0;

    for (const [, member] of members) {
      if (member.roles.cache.has(role.id)) continue;
      try {
        await member.roles.add(role, `Role all-add by ${message.author.tag}`);
        added++;
      } catch {
        // ignore role add errors
      }
    }

    await replyKey(client, message, "Correct", "commands.role.all_added", {
      added: added.toString(),
      role: role.toString(),
      type,
    });
  },
});

export const allRemoveSubcommand = new MessageSubcommand({
  name: "removeall",
  description:
    "Remove a role from all members of a type (humans/bots/members).",
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    {
      name: "type",
      aliases: ["t"],
      type: "string",
      required: true,
      description: "humans, bots, or members.",
    },
    {
      name: "role",
      aliases: ["r"],
      type: "role",
      required: true,
      description: "The role to remove.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const type = (args.getString("type") ?? "").toLowerCase();
    const role = args.getRole("role");
    if (!role) return;

    if (!["humans", "bots", "members"].includes(type)) {
      return replyKey(client, message, "warning", "commands.role.invalid_type");
    }

    const botCheck = checkManageable(client, message, role);
    if (!botCheck.ok) {
      return replyKey(client, message, "warning", botCheck.key, botCheck.vars);
    }

    await message.guild.members.fetch().catch(() => null);
    const members = message.guild.members.cache.filter((m) => {
      if (type === "humans") return !m.user.bot;
      if (type === "bots") return m.user.bot;
      return true;
    });

    let removed = 0;

    for (const [, member] of members) {
      if (!member.roles.cache.has(role.id)) continue;
      try {
        await member.roles.remove(
          role,
          `Role all-remove by ${message.author.tag}`,
        );
        removed++;
      } catch {
        // ignore role remove errors
      }
    }

    await replyKey(client, message, "Correct", "commands.role.all_removed", {
      removed: removed.toString(),
      role: role.toString(),
      type,
    });
  },
});

export const massAddSubcommand = new MessageSubcommand({
  name: "addmass",
  description: "Add a role to all members holding another role.",
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    {
      name: "target",
      aliases: ["t"],
      type: "role",
      required: true,
      description: "The role whose holders receive the new role.",
    },
    {
      name: "role",
      aliases: ["r"],
      type: "role",
      required: true,
      description: "The role to add.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const target = args.getRole("target");
    const role = args.getRole("role");
    if (!target || !role) return;

    if (target.id === role.id) {
      return replyKey(client, message, "warning", "commands.role.copy_same");
    }

    const botCheck = checkManageable(client, message, role);
    if (!botCheck.ok) {
      return replyKey(client, message, "warning", botCheck.key, botCheck.vars);
    }

    let added = 0;
    for (const [, member] of target.members) {
      if (member.roles.cache.has(role.id)) continue;
      try {
        await member.roles.add(role, `Role mass-add by ${message.author.tag}`);
        added++;
      } catch {
        // ignore role add errors
      }
    }

    await replyKey(client, message, "Correct", "commands.role.mass_added", {
      added: added.toString(),
      target: target.toString(),
      role: role.toString(),
    });
  },
});

export const massRemoveSubcommand = new MessageSubcommand({
  name: "removemass",
  description: "Remove a role from all members holding another role.",
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    {
      name: "target",
      aliases: ["t"],
      type: "role",
      required: true,
      description: "The role whose holders will lose the role.",
    },
    {
      name: "role",
      aliases: ["r"],
      type: "role",
      required: true,
      description: "The role to remove.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const target = args.getRole("target");
    const role = args.getRole("role");
    if (!target || !role) return;

    const botCheck = checkManageable(client, message, role);
    if (!botCheck.ok) {
      return replyKey(client, message, "warning", botCheck.key, botCheck.vars);
    }

    let removed = 0;
    for (const [, member] of target.members) {
      if (!member.roles.cache.has(role.id)) continue;
      try {
        await member.roles.remove(
          role,
          `Role mass-remove by ${message.author.tag}`,
        );
        removed++;
      } catch {
        // ignore role remove errors
      }
    }

    await replyKey(client, message, "Correct", "commands.role.mass_removed", {
      removed: removed.toString(),
      target: target.toString(),
      role: role.toString(),
    });
  },
});
