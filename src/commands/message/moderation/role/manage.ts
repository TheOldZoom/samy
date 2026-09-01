import { MessageSubcommand } from "@/classes/Command";
import {
  checkManageable,
  ensureGuild,
  guildOnlyReply,
  isManagedOrEveryone,
  replyKey,
  replyText,
} from "./shared";
import { parseColor } from "@/utils/role";

export const createSubcommand = new MessageSubcommand({
  name: "create",
  description: "Create a new role with optional color/gradient.",
  aliases: ["make", "new"],
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    { name: "name", type: "string", required: true, description: "Role name." },
    {
      name: "color",
      aliases: ["colour", "c"],
      type: "string",
      required: false,
      description: "Hex color or hex1,hex2 gradient.",
    },
    {
      name: "hoist",
      aliases: ["h"],
      type: "boolean",
      required: false,
      description: "Display members separately.",
    },
    {
      name: "mentionable",
      aliases: ["m"],
      type: "boolean",
      required: false,
      description: "Allow mentions.",
    },
    {
      name: "icon",
      aliases: ["i"],
      type: "string",
      required: false,
      description: "Emoji or URL for the role icon.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const name = args.getString("name");
    if (!name) {
      return replyText(
        client,
        message,
        client.i18n.t("commands.role.usage.create"),
      );
    }

    const colorInput = args.getString("color");
    const hoist = args.getBoolean("hoist") ?? false;
    const mentionable = args.getBoolean("mentionable") ?? false;
    const iconInput = args.getString("icon");

    let color: number | null = null;
    if (colorInput) {
      color = parseColor(colorInput);
      if (color === null) {
        return replyKey(
          client,
          message,
          "warning",
          "commands.role.invalid_color",
          { input: colorInput },
        );
      }
    }

    try {
      const role = await message.guild.roles.create({
        name,
        color: color ?? 0,
        hoist,
        mentionable,
        reason: `Role create by ${message.author.tag}`,
      });

      if (iconInput) {
        try {
          await role.setIcon(iconInput, `Role icon by ${message.author.tag}`);
        } catch {
          await role.delete("Rolling back after icon failure").catch(() => {});
          return replyKey(
            client,
            message,
            "warning",
            "commands.role.invalid_icon",
          );
        }
      }

      await replyKey(client, message, "createrole", "commands.role.created", {
        role: role.toString(),
      });
    } catch {
      await replyKey(client, message, "warning", "commands.role.failed");
    }
  },
});

export const deleteSubcommand = new MessageSubcommand({
  name: "delete",
  description: "Delete a role.",
  aliases: ["del"],
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    {
      name: "role",
      type: "role",
      required: true,
      description: "The role to delete.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const role = args.getRole("role");
    if (!role) {
      return replyText(
        client,
        message,
        client.i18n.t("commands.role.usage.delete"),
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

    const authorMember =
      message.member ??
      (await message.guild.members.fetch(message.author.id).catch(() => null));

    if (authorMember) {
      const check = canAuthorManageRole(authorMember, role);
      if (!check.ok) {
        return replyKey(client, message, "warning", "commands.role.hierarchy");
      }
    }

    const botCheck = checkManageable(client, message, role);
    if (!botCheck.ok) {
      return replyKey(client, message, "warning", botCheck.key, botCheck.vars);
    }

    try {
      await role.delete(`Role delete by ${message.author.tag}`);
      await replyKey(client, message, "deleterole", "commands.role.deleted", {
        role: role.name,
      });
    } catch {
      await replyKey(client, message, "warning", "commands.role.failed");
    }
  },
});

export const editSubcommand = new MessageSubcommand({
  name: "edit",
  description: "Edit a role's name, color, icon, hoist, mentionable.",
  aliases: ["update", "set"],
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    { name: "role", type: "role", required: true, description: "The role." },
    {
      name: "name",
      aliases: ["n"],
      type: "string",
      required: false,
      description: "New name.",
    },
    {
      name: "color",
      aliases: ["c", "colour"],
      type: "string",
      required: false,
      description: "New color or gradient.",
    },
    {
      name: "icon",
      aliases: ["i"],
      type: "string",
      required: false,
      description: "Emoji or URL.",
    },
    {
      name: "hoist",
      aliases: ["h"],
      type: "boolean",
      required: false,
      description: "Set hoisted.",
    },
    {
      name: "mentionable",
      aliases: ["m"],
      type: "boolean",
      required: false,
      description: "Set mentionable.",
    },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const role = args.getRole("role");
    if (!role) {
      return replyText(
        client,
        message,
        client.i18n.t("commands.role.usage.edit"),
      );
    }

    const name = args.getString("name");
    const colorInput = args.getString("color");
    const iconInput = args.getString("icon");
    const hoist = args.getBoolean("hoist");
    const mentionable = args.getBoolean("mentionable");

    if (
      name === undefined &&
      colorInput === undefined &&
      iconInput === undefined &&
      hoist === undefined &&
      mentionable === undefined
    ) {
      return replyText(
        client,
        message,
        client.i18n.t("commands.role.usage.edit"),
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

    const botCheck = checkManageable(client, message, role);
    if (!botCheck.ok) {
      return replyKey(client, message, "warning", botCheck.key, botCheck.vars);
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (hoist !== undefined) updates.hoist = hoist;
    if (mentionable !== undefined) updates.mentionable = mentionable;
    if (colorInput !== undefined) {
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
      updates.color = parsed;
    }

    try {
      if (Object.keys(updates).length > 0) {
        await role.edit({
          ...updates,
          reason: `Role edit by ${message.author.tag}`,
        });
      }

      if (iconInput !== undefined) {
        try {
          await role.setIcon(iconInput, `Role icon by ${message.author.tag}`);
        } catch {
          return replyKey(
            client,
            message,
            "warning",
            "commands.role.invalid_icon",
          );
        }
      }

      await replyKey(client, message, "updaterole", "commands.role.edited", {
        role: role.toString(),
      });
    } catch {
      await replyKey(client, message, "warning", "commands.role.failed");
    }
  },
});

function canAuthorManageRole(
  member: { roles: { highest: { position: number } } },
  role: { position: number },
) {
  if (role.position >= member.roles.highest.position) {
    return { ok: false, reason: "hierarchy" };
  }
  return { ok: true };
}
