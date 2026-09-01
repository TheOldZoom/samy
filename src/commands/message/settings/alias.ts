import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";
import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import { addAlias, getAlias, getAliases, removeAlias } from "@/utils/settings";

export default new MessageCommand({
  name: "alias",
  description: "Manage command aliases for this server.",
  category: "Settings",
  guildOnly: true,
  userPermissions: ["ManageGuild"],

  subcommands: [
    new MessageSubcommand({
      name: "add",
      description:
        "Add a new alias for a command. Use $1, $2, etc. for arguments, $* for all.",
      userPermissions: ["ManageGuild"],

      arguments: [
        {
          name: "alias",
          type: "string",
          description: "The alias to add.",
          required: true,
        },
        {
          name: "command",
          type: "string",
          description:
            "The command template. Use $1, $2, etc. for arguments, $* for all.",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const alias = args.getString("alias");
        const command = args.getString("command");

        if (!alias || !command) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text("Usage: `,alias add <alias> <command>`"),
              ),
            ],
          });

          return;
        }

        const cmdName = command.split(/\s+/)[0]!.toLowerCase();
        const cmd = client.messageCommands.get(cmdName);

        if (!cmd) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(Text(`Command \`${command}\` not found.`)),
            ],
          });

          return;
        }

        const existingAlias = await getAlias(message.guild!.id, alias, client);

        if (existingAlias) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.link +
                    " " +
                    client.i18n.t("commands.alias.already_exists", { alias }),
                ),
              ),
            ],
          });

          return;
        }

        if (client.messageCommands.has(alias.toLowerCase())) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(`A command named \`${alias}\` already exists.`),
              ),
            ],
          });

          return;
        }

        try {
          await addAlias(message.guild!.id, alias, command, client);

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.link +
                    " " +
                    client.i18n.t("commands.alias.added", {
                      alias,
                      command: cmd.name,
                    }),
                ),
              ),
            ],
          });
        } catch (e) {
          console.log(e);
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text("Failed to add alias. It might already exist."),
              ),
            ],
          });
        }
      },
    }),

    new MessageSubcommand({
      name: "remove",
      description: "Remove an alias.",
      userPermissions: ["ManageGuild"],

      arguments: [
        {
          name: "alias",
          type: "string",
          description: "The alias to remove.",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const alias = args.getString("alias");

        if (!alias) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(Text("Usage: `,alias remove <alias>`")),
            ],
          });

          return;
        }

        const removed = await removeAlias(message.guild!.id, alias, client);

        if (!removed) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.link +
                    " " +
                    client.i18n.t("commands.alias.not_found", { alias }),
                ),
              ),
            ],
          });

          return;
        }

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                icons.link +
                  " " +
                  client.i18n.t("commands.alias.removed", { alias }),
              ),
            ),
          ],
        });
      },
    }),

    new MessageSubcommand({
      name: "list",
      description: "List all aliases for this server.",
      userPermissions: ["ManageGuild"],

      async execute(client, message) {
        const aliases = await getAliases(message.guild!.id, client);

        if (aliases.length === 0) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(icons.link + " " + client.i18n.t("commands.alias.none")),
              ),
            ],
          });

          return;
        }

        const lines = aliases
          .map((a) => `\`${a.alias}\` → \`${a.command}\``)
          .join("\n");

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                icons.link +
                  " " +
                  client.i18n.t("commands.alias.list_title", {
                    aliases: lines,
                  }),
              ),
            ),
          ],
        });
      },
    }),
  ],
});
