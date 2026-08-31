import { MessageSubcommand } from "@/classes/Command";
import {
  checkManageable,
  ensureGuild,
  guildOnlyReply,
  isManagedOrEveryone,
  replyKey,
  replyText,
} from "./shared";

import { colorToHex, parseColor } from "@/utils/role";

export const editColorSubcommand = new MessageSubcommand({
  name: "color",
  aliases: ["colour"],
  description: "Edit a role's color.",
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    { name: "role", type: "role", required: true, description: "The role." },
    {
      name: "color",
      aliases: ["c"],
      type: "string",
      required: true,
      description: "Hex color or gradient.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const role = args.getRole("role");
    const colorInput = args.getString("color");
    if (!role || !colorInput) {
      return replyText(
        client,
        message,
        client.i18n.t("commands.role.usage.color"),
      );
    }

    if (isManagedOrEveryone(role)) {
      return replyKey(
        client,
        message,
        "warning",
        "commands.role.cannot_manage",
      );
    }

    const parsed = parseColor(colorInput);
    if (parsed === null) {
      return replyKey(
        client,
        message,
        "warning",
        "commands.role.invalid_color",
        { input: colorInput },
      );
    }

    try {
      await role.setColor(parsed, `Role color by ${message.author.tag}`);
      await replyKey(client, message, "colornitro", "commands.role.color_set", {
        role: role.toString(),
        color: colorToHex(parsed),
      });
    } catch {
      await replyKey(client, message, "warning", "commands.role.failed");
    }
  },
});

export const editNameSubcommand = new MessageSubcommand({
  name: "name",
  description: "Edit a role's name.",
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    { name: "role", type: "role", required: true, description: "The role." },
    {
      name: "name",
      aliases: ["n"],
      type: "string",
      required: true,
      description: "New name.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const role = args.getRole("role");
    const name = args.getString("name");
    if (!role || !name) {
      return replyText(
        client,
        message,
        client.i18n.t("commands.role.usage.name"),
      );
    }

    if (isManagedOrEveryone(role)) {
      return replyKey(
        client,
        message,
        "warning",
        "commands.role.cannot_manage",
      );
    }

    try {
      await role.setName(name, `Role rename by ${message.author.tag}`);
      await replyKey(client, message, "edit", "commands.role.name_set", {
        role: role.toString(),
      });
    } catch {
      await replyKey(client, message, "warning", "commands.role.failed");
    }
  },
});

export const editIconSubcommand = new MessageSubcommand({
  name: "icon",
  description: "Edit a role's icon.",
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    { name: "role", type: "role", required: true, description: "The role." },
    {
      name: "emoji",
      aliases: ["e", "i"],
      type: "string",
      required: true,
      description: "Emoji or URL.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const role = args.getRole("role");
    const emoji = args.getString("emoji");
    if (!role || !emoji) {
      return replyText(
        client,
        message,
        client.i18n.t("commands.role.usage.icon"),
      );
    }

    if (isManagedOrEveryone(role)) {
      return replyKey(
        client,
        message,
        "warning",
        "commands.role.cannot_manage",
      );
    }

    try {
      await role.setIcon(emoji, `Role icon by ${message.author.tag}`);
      await replyKey(client, message, "updaterole", "commands.role.icon_set", {
        role: role.toString(),
      });
    } catch {
      await replyKey(client, message, "warning", "commands.role.failed");
    }
  },
});

export const editHoistSubcommand = new MessageSubcommand({
  name: "hoist",
  description: "Toggle whether a role is hoisted.",
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    { name: "role", type: "role", required: true, description: "The role." },
    {
      name: "state",
      aliases: ["s"],
      type: "boolean",
      required: false,
      description: "true/false to set, omit to toggle.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const role = args.getRole("role");
    if (!role) {
      return replyText(
        client,
        message,
        client.i18n.t("commands.role.usage.hoist"),
      );
    }

    if (isManagedOrEveryone(role)) {
      return replyKey(
        client,
        message,
        "warning",
        "commands.role.cannot_manage",
      );
    }

    const newHoist =
      args.getBoolean("state") !== undefined
        ? args.getBoolean("state")!
        : !role.hoist;

    try {
      await role.setHoist(newHoist, `Role hoist by ${message.author.tag}`);
      await replyKey(
        client,
        message,
        "updaterole",
        newHoist ? "commands.role.hoisted" : "commands.role.unhoisted",
        { role: role.toString() },
      );
    } catch {
      await replyKey(client, message, "warning", "commands.role.failed");
    }
  },
});

export const editMentionableSubcommand = new MessageSubcommand({
  name: "mentionable",
  description: "Toggle whether a role is mentionable.",
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    { name: "role", type: "role", required: true, description: "The role." },
    {
      name: "state",
      aliases: ["s"],
      type: "boolean",
      required: false,
      description: "true/false to set, omit to toggle.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const role = args.getRole("role");
    if (!role) {
      return replyText(
        client,
        message,
        client.i18n.t("commands.role.usage.mentionable"),
      );
    }

    if (isManagedOrEveryone(role)) {
      return replyKey(
        client,
        message,
        "warning",
        "commands.role.cannot_manage",
      );
    }

    const newState =
      args.getBoolean("state") !== undefined
        ? args.getBoolean("state")!
        : !role.mentionable;

    try {
      await role.setMentionable(
        newState,
        `Role mentionable by ${message.author.tag}`,
      );
      await replyKey(
        client,
        message,
        "updaterole",
        newState
          ? "commands.role.mentionable_set"
          : "commands.role.unmentionable_set",
        { role: role.toString() },
      );
    } catch {
      await replyKey(client, message, "warning", "commands.role.failed");
    }
  },
});

export const topSubcommand = new MessageSubcommand({
  name: "top",
  description: "Move a role to the top of the role list.",
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    { name: "role", type: "role", required: true, description: "The role." },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const role = args.getRole("role");
    if (!role) return;

    if (isManagedOrEveryone(role)) {
      return replyKey(
        client,
        message,
        "warning",
        "commands.role.cannot_manage",
      );
    }

    const botCheck = await checkManageable(client, message, role);
    if (!botCheck.ok) {
      return replyKey(client, message, "warning", botCheck.key, botCheck.vars);
    }

    try {
      const botMember = message.guild.members.me;
      if (!botMember) {
        return replyKey(client, message, "warning", "commands.role.failed");
      }
      await role.setPosition(
        Math.max(0, botMember.roles.highest.position - 1),
        { reason: `Role top by ${message.author.tag}` },
      );
      await replyKey(client, message, "uparrow", "commands.role.topped", {
        role: role.toString(),
      });
    } catch {
      await replyKey(client, message, "warning", "commands.role.failed");
    }
  },
});

export const topColorSubcommand = new MessageSubcommand({
  name: "topcolor",
  description: "Set a member's top role color.",
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    {
      name: "member",
      type: "member",
      required: true,
      description: "The member.",
    },
    {
      name: "color",
      aliases: ["c", "colour"],
      type: "string",
      required: true,
      description: "Hex color or gradient.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const member = args.getMember("member");
    const colorInput = args.getString("color");
    if (!member || !colorInput) return;

    const topRole = member.roles.highest;
    if (topRole.id === message.guild.roles.everyone.id) {
      return replyKey(client, message, "warning", "commands.role.no_top_role");
    }

    const botCheck = await checkManageable(client, message, topRole);
    if (!botCheck.ok) {
      return replyKey(client, message, "warning", botCheck.key, botCheck.vars);
    }

    const parsed = parseColor(colorInput);
    if (parsed === null) {
      return replyKey(
        client,
        message,
        "warning",
        "commands.role.invalid_color",
        { input: colorInput },
      );
    }

    try {
      await topRole.setColor(parsed, `Top role color by ${message.author.tag}`);
      await replyKey(
        client,
        message,
        "colornitro",
        "commands.role.topcolor_set",
        {
          member: member.toString(),
          role: topRole.toString(),
          color: colorToHex(parsed),
        },
      );
    } catch {
      await replyKey(client, message, "warning", "commands.role.failed");
    }
  },
});

export const copySubcommand = new MessageSubcommand({
  name: "copy",
  description: "Copy a role's properties to another role.",
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    {
      name: "source",
      aliases: ["s", "from"],
      type: "role",
      required: true,
      description: "Source role.",
    },
    {
      name: "target",
      aliases: ["t", "to"],
      type: "role",
      required: true,
      description: "Target role.",
    },
    {
      name: "fields",
      aliases: ["f"],
      type: "string",
      required: false,
      description:
        "Comma-separated: name,color,permissions,hoist,icon,mentionable. Default: all.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const source = args.getRole("source");
    const target = args.getRole("target");
    if (!source || !target) return;

    if (source.id === target.id) {
      return replyKey(client, message, "warning", "commands.role.copy_same");
    }

    if (isManagedOrEveryone(target)) {
      return replyKey(
        client,
        message,
        "warning",
        "commands.role.cannot_manage",
      );
    }

    const botCheck = await checkManageable(client, message, target);
    if (!botCheck.ok) {
      return replyKey(client, message, "warning", botCheck.key, botCheck.vars);
    }

    const fieldsInput = args.getString("fields");
    const fields = fieldsInput
      ? fieldsInput.split(",").map((f) => f.trim().toLowerCase())
      : ["name", "color", "permissions", "hoist", "icon", "mentionable"];

    const updates: Record<string, unknown> = {};
    if (fields.includes("name")) updates.name = source.name;
    if (fields.includes("color")) updates.color = source.color;
    if (fields.includes("hoist")) updates.hoist = source.hoist;
    if (fields.includes("mentionable"))
      updates.mentionable = source.mentionable;
    if (fields.includes("permissions"))
      updates.permissions = source.permissions.bitfield;

    try {
      if (Object.keys(updates).length > 0) {
        await target.edit({
          ...updates,
          reason: `Role copy by ${message.author.tag}`,
        } as Parameters<typeof target.edit>[0]);
      }

      if (fields.includes("icon")) {
        const sourceIcon = source.iconURL();
        if (sourceIcon) {
          await target.setIcon(
            sourceIcon,
            `Role icon copy by ${message.author.tag}`,
          );
        } else if (target.icon) {
          await target.setIcon(
            null,
            `Role icon clear by ${message.author.tag}`,
          );
        }
      }

      await replyKey(client, message, "Correct", "commands.role.copied", {
        source: source.toString(),
        target: target.toString(),
      });
    } catch {
      await replyKey(client, message, "warning", "commands.role.failed");
    }
  },
});
