import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import {
  buildCommandView,
  buildOverview,
  buildSubcommandView,
  resolveSubcommand,
} from "@/ui/help";
import errorUI from "@/ui/error";

export default new MessageCommand({
  name: "help",

  description: "Browse all commands or view details about a specific command.",

  category: "Utility",

  aliases: ["h", "commands"],

  arguments: [
    {
      name: "command",
      aliases: ["c"],
      type: "string",
      description: "The command to get more information about",
      required: false,
    },
  ],

  async execute(client, message, args) {
    try {
      const raw = args.getString("command")?.toLowerCase();

      if (raw) {
        const tokens = raw.split(/\s+/).filter(Boolean);

        const commandName = tokens[0];
        const subPath = tokens.slice(1);

        if (!commandName) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,

            components: [
              errorUI(
                icons.info +
                  " " +
                  client.i18n.t("commands.help.not_found", {
                    command: raw,
                  }),
              ),
            ],
          });

          return;
        }

        const command =
          client.messageCommands.get(commandName) ??
          client.messageCommands.find((cmd) =>
            cmd.aliases.some((alias) => alias.toLowerCase() === commandName),
          );

        if (!command) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,

            components: [
              errorUI(
                icons.info +
                  " " +
                  client.i18n.t("commands.help.not_found", {
                    command: raw,
                  }),
              ),
            ],
          });

          return;
        }

        const category = command.options.category ?? "Uncategorized";

        if (subPath.length === 0) {
          const container = buildCommandView(
            client,
            message.author.id,
            category,
            command.name,
          );

          if (!container) {
            return;
          }

          await message.reply({
            flags: MessageFlags.IsComponentsV2,

            components: [container],
          });

          return;
        }

        const resolved = resolveSubcommand(command, subPath);

        if (!resolved) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,

            components: [
              errorUI(
                icons.info +
                  " " +
                  client.i18n.t("commands.help.not_found", {
                    command: raw,
                  }),
              ),
            ],
          });

          return;
        }

        const container = buildSubcommandView(
          client,
          message.author.id,
          category,
          command.name,
          resolved.canonicalPath,
        );

        if (!container) {
          return;
        }

        await message.reply({
          flags: MessageFlags.IsComponentsV2,

          components: [container],
        });

        return;
      }

      const container = buildOverview(client, message.author.id);

      await message.reply({
        flags: MessageFlags.IsComponentsV2,

        components: [container],
      });
    } catch (error) {
      client.logger.error("Failed to build help menu", {
        error,
        user: message.author.id,
      });

      await message.reply({
        flags: MessageFlags.IsComponentsV2,

        components: [
          errorUI(
            icons.info + " " + client.i18n.t("commands.help.fetch_error"),
          ),
        ],
      });
    }
  },
});
