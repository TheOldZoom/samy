import { AttachmentBuilder, MessageFlags } from "discord.js";
import { MessageSubcommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import { icons } from "@/utils/icons";
import { ensureGuild, guildOnlyReply, replyKey } from "./shared";
import { colorToHex } from "@/utils/role";

export const roleinfoSubcommand = new MessageSubcommand({
  name: "info",
  description: "View information about a role.",
  aliases: ["ri", "roleinfo"],
  arguments: [
    { name: "role", type: "role", required: true, description: "The role." },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const role = args.getRole("role");
    if (!role) return;

    await message.guild.members.fetch().catch(() => null);

    const permissions = role.permissions.toArray().join(", ") || "None";
    const created = Math.floor(role.createdTimestamp / 1000);
    const position = role.position;
    const hoist = role.hoist ? "Yes" : "No";
    const mentionable = role.mentionable ? "Yes" : "No";
    const managed = role.managed ? "Yes" : "No";
    const color = colorToHex(role.color);
    const count = role.members.size;

    const lines = [
      `**Name:** ${role.toString()} (\`${role.name}\`)`,
      `**ID:** \`${role.id}\``,
      `**Color:** ${color}`,
      `**Position:** ${position}`,
      `**Hoisted:** ${hoist}`,
      `**Mentionable:** ${mentionable}`,
      `**Managed:** ${managed}`,
      `**Members:** ${count}`,
      `**Created:** <t:${created}:R>`,
      `**Permissions:** ${permissions}`,
    ].join("\n");

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [new Container().text(Text(icons.roles + " " + lines))],
    });
  },
});

export const rolesSubcommand = new MessageSubcommand({
  name: "list",
  description: "View all roles in the server.",
  aliases: ["roles"],
  async execute(client, message) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    await message.guild.members.fetch().catch(() => null);

    const roles = [...message.guild.roles.cache.values()]
      .filter((r) => r.id !== message.guild.roles.everyone.id)
      .sort((a, b) => b.position - a.position);

    if (roles.length === 0) {
      return replyKey(client, message, "roles", "commands.role.all_empty");
    }

    const lines = roles
      .map(
        (r) =>
          `${r.toString()} - **${r.members.size}** members • ${colorToHex(r.color)}`,
      )
      .join("\n");

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            icons.roles +
              " " +
              client.i18n.t("commands.role.roles_list", {
                count: roles.length,
                roles: lines,
              }),
          ),
        ),
      ],
    });
  },
});

export const dumpSubcommand = new MessageSubcommand({
  name: "dump",
  description: "Dump all members of a role to a text file.",
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  arguments: [
    { name: "role", type: "role", required: true, description: "The role." },
  ],
  async execute(client, message, args) {
    if (!ensureGuild(message)) return guildOnlyReply(client, message);

    const role = args.getRole("role");
    if (!role) return;

    await message.guild.members.fetch().catch(() => null);

    const members = [...role.members.values()].sort((a, b) =>
      a.user.tag.localeCompare(b.user.tag),
    );

    const header = `Role: ${role.name} (${role.id})\nGuild: ${message.guild.name} (${message.guild.id})\nMembers: ${members.length}\n\n`;

    const body = members
      .map(
        (m) =>
          `${m.user.tag} | ${m.id} | ${m.user.bot ? "bot" : "human"}${m.nickname ? ` | ${m.nickname}` : ""}`,
      )
      .join("\n");

    const attachment = new AttachmentBuilder(
      Buffer.from(header + body, "utf-8"),
      { name: `${role.name.replace(/[^a-z0-9_-]+/gi, "_")}-members.txt` },
    );

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            icons.roles +
              " " +
              client.i18n.t("commands.role.dumped", {
                role: role.toString(),
                count: members.length,
              }),
          ),
        ),
      ],
      files: [attachment],
    });
  },
});
