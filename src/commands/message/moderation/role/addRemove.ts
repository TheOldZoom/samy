import { MessageSubcommand } from "@/classes/Command";
import {
  checkManageable,
  ensureGuild,
  guildOnlyReply,
  replyKey,
  replyText,
  resolveRoleList,
} from "./shared";

export const addSubcommand = new MessageSubcommand({
  name: "add",
  description: "Add roles to a member.",
  aliases: ["a"],
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    {
      name: "member",
      type: "member",
      required: true,
      description: "The member to add roles to.",
    },
    {
      name: "roles",
      type: "string",
      required: true,
      description: "One or more roles to add.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const member = args.getMember("member");
    const rolesRaw = args.getString("roles");

    if (!member || !rolesRaw) {
      return replyText(
        client,
        message,
        client.i18n.t("commands.role.usage.add"),
      );
    }

    const { roles, errors } = await resolveRoleList(client, message, rolesRaw);

    if (roles.length === 0) {
      return replyKey(client, message, "warning", "commands.role.no_roles", {
        errors: errors.join(", "),
      });
    }

    let added = 0;

    for (const role of roles) {
      if (member.roles.cache.has(role.id)) continue;
      const check = checkManageable(client, message, role);
      if (!check.ok) continue;
      try {
        await member.roles.add(role, `Role add by ${message.author.tag}`);
        added++;
      } catch {}
    }

    await replyKey(
      client,
      message,
      added > 0 ? "Correct" : "warning",
      "commands.role.added",
      {
        member: member.toString(),
      },
    );
  },
});

export const toggleSubcommand = new MessageSubcommand({
  name: "toggle",
  description: "Toggle a role on a member.",
  aliases: ["t"],
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    {
      name: "member",
      type: "member",
      required: true,
      description: "The member to toggle the role on.",
    },
    {
      name: "role",
      type: "role",
      required: true,
      description: "The role to toggle.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const member = args.getMember("member");
    const role = args.getRole("role");
    if (!member || !role) {
      return replyText(
        client,
        message,
        client.i18n.t("commands.role.usage.toggle"),
      );
    }

    const check = checkManageable(client, message, role);
    if (!check.ok) {
      return replyKey(client, message, "warning", check.key, check.vars);
    }

    const hasRole = member.roles.cache.has(role.id);
    try {
      if (hasRole) {
        await member.roles.remove(role, `Role toggle by ${message.author.tag}`);
      } else {
        await member.roles.add(role, `Role toggle by ${message.author.tag}`);
      }
    } catch {
      return replyKey(client, message, "warning", "commands.role.failed");
    }

    await replyKey(
      client,
      message,
      "Correct",
      hasRole ? "commands.role.toggled_off" : "commands.role.toggled_on",
      { member: member.toString(), role: role.toString() },
    );
  },
});

export const removeSubcommand = new MessageSubcommand({
  name: "remove",
  description: "Remove roles from a member.",
  aliases: ["rm"],
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    {
      name: "member",
      type: "member",
      required: true,
      description: "The member to remove roles from.",
    },
    {
      name: "roles",
      type: "string",
      required: true,
      description: "One or more roles to remove.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const member = args.getMember("member");
    const rolesRaw = args.getString("roles");

    if (!member || !rolesRaw) {
      return replyText(
        client,
        message,
        client.i18n.t("commands.role.usage.remove"),
      );
    }

    const { roles, errors } = await resolveRoleList(client, message, rolesRaw);

    if (roles.length === 0) {
      return replyKey(client, message, "warning", "commands.role.no_roles", {
        errors: errors.join(", "),
      });
    }

    let removed = 0;

    for (const role of roles) {
      if (!member.roles.cache.has(role.id)) continue;
      const check = checkManageable(client, message, role);
      if (!check.ok) continue;
      try {
        await member.roles.remove(role, `Role remove by ${message.author.tag}`);
        removed++;
      } catch {}
    }

    await replyKey(
      client,
      message,
      removed > 0 ? "Correct" : "warning",
      "commands.role.removed",
      {
        member: member.toString(),
      },
    );
  },
});
