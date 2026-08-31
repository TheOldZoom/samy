import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand, MessageSubcommand } from "@/classes/Command";

import { Container, Text } from "@/ui/components";
import type Client from "@/classes/client";
import { getGuildPrefix, getUserPrefix } from "@/utils/settings";

export default new MessageCommand({
  name: "prefix",
  description: "View or manage the server and user prefix.",
  category: "Settings",
  guildOnly: true,

  botPermissions: ["SendMessages", "EmbedLinks"],

  subcommands: [
    new MessageSubcommand({
      name: "add",
      description: "Set a custom prefix.",
      botPermissions: ["SendMessages", "EmbedLinks"],

      subcommands: [
        new MessageSubcommand({
          name: "guild",
          description: "Set the server prefix.",
          userPermissions: ["ManageGuild"],

          arguments: [
            {
              name: "prefix",
              type: "string",
              description: "The new server prefix.",
              required: true,
            },
          ],

          async execute(client, message, args) {
            const prefix = args.getString("prefix");

            if (!prefix) {
              return;
            }

            if (prefix.length > 5) {
              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(icons.cmd + " " + client.i18n.t("commands.prefix.too_long")),
                  ),
                ],
              });

              return;
            }

            await client.prisma.guild.upsert({
              where: {
                id: message.guild!.id,
              },
              create: {
                id: message.guild!.id,
                prefix,
              },
              update: {
                prefix,
              },
            });

            client.guildPrefixes.set(message.guild!.id, prefix);

            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [
                new Container().text(
                  Text(icons.cmd + " " + client.i18n.t("commands.prefix.set_guild", {
                      prefix,
                    }),
                  ),
                ),
              ],
            });
          },
        }),

        new MessageSubcommand({
          name: "user",
          description: "Set your personal prefix.",

          arguments: [
            {
              name: "prefix",
              type: "string",
              description: "Your new personal prefix.",
              required: true,
            },
          ],

          async execute(client, message, args) {
            const prefix = args.getString("prefix");

            if (!prefix) {
              return;
            }

            if (prefix.length > 5) {
              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(icons.cmd + " " + client.i18n.t("commands.prefix.too_long")),
                  ),
                ],
              });

              return;
            }

            await client.prisma.user.upsert({
              where: {
                id: message.author.id,
              },
              create: {
                id: message.author.id,
                prefix,
              },
              update: {
                prefix,
              },
            });

            client.userPrefixes.set(message.author.id, prefix);

            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [
                new Container().text(
                  Text(icons.cmd + " " + client.i18n.t("commands.prefix.set_user", {
                      prefix,
                    }),
                  ),
                ),
              ],
            });
          },
        }),
      ],
    }),

    new MessageSubcommand({
      name: "remove",
      description: "Remove a custom prefix.",

      subcommands: [
        new MessageSubcommand({
          name: "guild",
          description: "Remove the server prefix.",
          userPermissions: ["ManageGuild"],

          async execute(client, message) {
            await client.prisma.guild.update({
              where: {
                id: message.guild!.id,
              },
              data: {
                prefix: null,
              },
            });

            client.guildPrefixes.set(message.guild!.id, null);

            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [
                new Container().text(
                  Text(icons.cmd + " " + client.i18n.t("commands.prefix.removed_guild")),
                ),
              ],
            });
          },
        }),

        new MessageSubcommand({
          name: "user",
          description: "Remove your personal prefix.",

          async execute(client, message) {
            await client.prisma.user.update({
              where: {
                id: message.author.id,
              },
              data: {
                prefix: null,
              },
            });

            client.userPrefixes.set(message.author.id, null);

            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [
                new Container().text(
                  Text(icons.cmd + " " + client.i18n.t("commands.prefix.removed_user")),
                ),
              ],
            });
          },
        }),
      ],
    }),

    new MessageSubcommand({
      name: "view",
      description: "View the current prefix.",

      async execute(client, message) {
        const guildId = message.guild!.id;
        const userId = message.author.id;

        const [guildPrefix, userPrefix] = await Promise.all([
          getGuildPrefix(guildId, client),
          getUserPrefix(userId, client),
        ]);

        const effective = userPrefix ?? guildPrefix ?? client.prefix;

        const response = client.i18n.t("commands.prefix.view", {
          prefix: effective,
          guild_prefix: guildPrefix ?? effective,
          user_prefix: userPrefix ?? "Not set",
        });

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [new Container().text(Text(response))],
        });
      },
    }),
  ],
});
