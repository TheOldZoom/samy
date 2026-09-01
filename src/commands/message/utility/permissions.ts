import { MessageFlags, type GuildTextBasedChannel } from "discord.js";

import { icons } from "@/utils/icons";
import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import { getFakePermissions } from "@/utils/settings";

function formatPermissionList(perms: string[]): string {
  if (perms.length === 0) return "None";

  return perms.map((p) => `\`${p}\``).join(", ");
}

export default new MessageCommand({
  name: "permissions",
  description: "View real and fake permissions for a member or role.",
  category: "Utility",
  guildOnly: true,

  subcommands: [
    new MessageSubcommand({
      name: "member",
      description: "View permissions for a member.",

      arguments: [
        {
          name: "member",
          type: "member",
          description: "The member to check.",
          required: false,
        },
      ],

      async execute(client, message, args) {
        const member = args.getMember("member") ?? message.member;

        if (!member) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.Guardian +
                    " " +
                    client.i18n.t("commands.permissions.member_not_found"),
                ),
              ),
            ],
          });

          return;
        }

        const guildId = message.guild!.id;
        const channel = message.channel as GuildTextBasedChannel;

        const channelPermissions = channel.permissionsFor(member);
        const realPermissions = channelPermissions
          ? channelPermissions.toArray()
          : [];

        const seenPermissions = new Set<string>();
        const fakeEntries: { permission: string; roleId: string }[] = [];

        for (const role of member.roles.cache.values()) {
          const rolePerms = await getFakePermissions(guildId, role.id, client);

          for (const fp of rolePerms) {
            if (seenPermissions.has(fp.permission)) continue;

            seenPermissions.add(fp.permission);
            fakeEntries.push({ permission: fp.permission, roleId: role.id });
          }
        }

        const lines: string[] = [
          `**Real permissions (in this channel):**\n${formatPermissionList(
            realPermissions,
          )}`,
          "",
          fakeEntries.length > 0
            ? `**Fake permissions:**\n${fakeEntries
                .map((e) => `\`${e.permission}\` (via <@&${e.roleId}>)`)
                .join(", ")}`
            : "**Fake permissions:** None",
        ];

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
          components: [
            new Container().text(
              Text(
                icons.Guardian +
                  " " +
                  client.i18n.t("commands.permissions.member_title", {
                    user: member.toString(),
                    content: lines.join("\n"),
                  }),
              ),
            ),
          ],
        });
      },
    }),

    new MessageSubcommand({
      name: "role",
      description: "View permissions granted by a role.",

      arguments: [
        {
          name: "role",
          type: "role",
          description: "The role to check.",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const role = args.getRole("role");

        if (!role) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.Guardian +
                    " " +
                    client.i18n.t("commands.permissions.role_not_found"),
                ),
              ),
            ],
          });

          return;
        }

        const guildId = message.guild!.id;

        const realPermissions = role.permissions.toArray();
        const fakePermissions = await getFakePermissions(
          guildId,
          role.id,
          client,
        );

        const lines: string[] = [
          `**Real permissions:**\n${formatPermissionList(realPermissions)}`,
          "",
          `**Fake permissions:**\n${formatPermissionList(
            fakePermissions.map((fp) => fp.permission),
          )}`,
        ];

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
          components: [
            new Container().text(
              Text(
                icons.Guardian +
                  " " +
                  client.i18n.t("commands.permissions.role_title", {
                    role: role.toString(),
                    content: lines.join("\n"),
                  }),
              ),
            ),
          ],
        });
      },
    }),
  ],
});
