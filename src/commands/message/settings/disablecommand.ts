import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";
import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import { setCommandEnabledForGuild } from "@/utils/settings";

export default new MessageCommand({
  name: "disablecommand",
  description: "Disable a command in this server.",
  category: "Settings",
  guildOnly: true,
  userPermissions: ["ManageGuild"],

  arguments: [
    {
      name: "command",
      type: "string",
      description: "The command to disable.",
      required: true,
    },
  ],

  async execute(client, message, args) {
    const commandName = args.getString("command");

    if (!commandName) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(Text("Usage: `,disablecommand <command>`")),
        ],
      });

      return;
    }

    const cmd =
      client.messageCommands.get(commandName.toLowerCase()) ??
      client.slashCommands.get(commandName.toLowerCase()) ??
      client.contextCommands.get(commandName.toLowerCase()) ??
      client.messageCommands.find((c) =>
        c.aliases.includes(commandName.toLowerCase()),
      );

    if (!cmd) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.disable +
                " " +
                client.i18n.t("commands.disablecommand.command_not_found", {
                  command: commandName,
                }),
            ),
          ),
        ],
      });

      return;
    }

    if (cmd.name === "disablecommand" || cmd.name === "enablecommand") {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(Text("You cannot manage that command.")),
        ],
      });

      return;
    }

    await setCommandEnabledForGuild(message.guild!.id, cmd.name, false, client);

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            icons.disable +
              " " +
              client.i18n.t("commands.disablecommand.success", {
                command: cmd.name,
                scope: "",
              }),
          ),
        ),
      ],
    });
  },
});
