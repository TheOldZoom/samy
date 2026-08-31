import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand, MessageSubcommand } from "@/classes/Command";

import { Container, Text } from "@/ui/components";

import {
  addCommandRestriction,
  clearCommandRestrictions,
  getAllCommandRestrictions,
  removeCommandRestriction,
} from "@/utils/settings";

function resolveCommandPath(client: { messageCommands: { get: (name: string) => unknown; find: (fn: (cmd: { aliases: string[] }) => boolean) => unknown } }, input: string): string | null {
  const parts = input
    .trim()
    .toLowerCase()
    .split(":")
    .map((part: string) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  const command =
    client.messageCommands.get(parts[0]) ??
    client.messageCommands.find((cmd: { aliases: string[] }) => cmd.aliases.includes(parts[0]));

  if (!command) {
    return null;
  }

  const path: string[] = [];

  for (const part of parts.slice(1)) {
    const subcommand = command.find(part);

    if (!subcommand) {
      return null;
    }

    path.push(subcommand.name);
  }

  return [command.name, ...path].join(":").toLowerCase();
}

export default new MessageCommand({
  name: "restrictcommand",
  description: "Restrict a command to specific roles.",
  category: "Settings",
  guildOnly: true,
  userPermissions: ["ManageGuild"],

  subcommands: [
    new MessageSubcommand({
      name: "add",
      description: "Add a role restriction to a command.",
      userPermissions: ["ManageGuild"],

      arguments: [
        {
          name: "command",
          type: "string",
          description:
            "The command to restrict. Use command:subcommand for subcommands.",
          required: true,
        },
        {
          name: "role",
          type: "role",
          description: "The role to restrict to.",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const commandInput = args.getString("command");
        const role = args.getRole("role");

        if (!commandInput || !role) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text("Usage: `,restrictcommand add <command> <role>`"),
              ),
            ],
          });

          return;
        }

        const commandName = resolveCommandPath(client, commandInput);

        if (!commandName) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(icons.ban + " " + client.i18n.t("commands.restrictcommand.command_not_found", {
                    command: commandInput,
                  }),
                ),
              ),
            ],
          });

          return;
        }

        try {
          await addCommandRestriction(
            message.guild!.id,
            commandName,
            role.id,
            client,
          );

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(icons.ban + " " + client.i18n.t("commands.restrictcommand.added", {
                    command: commandName,
                    role: role.name,
                  }),
                ),
              ),
            ],
          });
        } catch (error) {
          client.logger.error("Failed to add command restriction", {
            error,
            guild: message.guild!.id,
            command: commandName,
            role: role.id,
          });

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(Text("Failed to add restriction.")),
            ],
          });
        }
      },
    }),

    new MessageSubcommand({
      name: "remove",
      description: "Remove a role restriction from a command.",
      userPermissions: ["ManageGuild"],

      arguments: [
        {
          name: "command",
          type: "string",
          description:
            "The command to unrestrict. Use command:subcommand for subcommands.",
          required: true,
        },
        {
          name: "role",
          type: "role",
          description: "The role to remove.",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const commandInput = args.getString("command");
        const role = args.getRole("role");

        if (!commandInput || !role) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text("Usage: `,restrictcommand remove <command> <role>`"),
              ),
            ],
          });

          return;
        }

        const commandName = resolveCommandPath(client, commandInput);

        if (!commandName) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(icons.ban + " " + client.i18n.t("commands.restrictcommand.command_not_found", {
                    command: commandInput,
                  }),
                ),
              ),
            ],
          });

          return;
        }

        const removed = await removeCommandRestriction(
          message.guild!.id,
          commandName,
          role.id,
          client,
        );

        if (!removed) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(icons.ban + " " + client.i18n.t("commands.restrictcommand.not_found")),
              ),
            ],
          });

          return;
        }

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(icons.ban + " " + client.i18n.t("commands.restrictcommand.removed")),
            ),
          ],
        });
      },
    }),

    new MessageSubcommand({
      name: "clear",
      description: "Clear all restrictions from a command.",
      userPermissions: ["ManageGuild"],

      arguments: [
        {
          name: "command",
          type: "string",
          description: "The command to clear restrictions from.",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const commandInput = args.getString("command");

        if (!commandInput) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text("Usage: `,restrictcommand clear <command>`"),
              ),
            ],
          });

          return;
        }

        const commandName = resolveCommandPath(client, commandInput);

        if (!commandName) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(icons.ban + " " + client.i18n.t("commands.restrictcommand.command_not_found", {
                    command: commandInput,
                  }),
                ),
              ),
            ],
          });

          return;
        }

        const count = await clearCommandRestrictions(
          message.guild!.id,
          commandName,
          client,
        );

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(icons.ban + " " + client.i18n.t("commands.restrictcommand.cleared", {
                  count,
                  command: commandName,
                }),
              ),
            ),
          ],
        });
      },
    }),

    new MessageSubcommand({
      name: "list",
      description: "List all restricted commands.",
      userPermissions: ["ManageGuild"],

      async execute(client, message) {
        const restrictions = await getAllCommandRestrictions(
          message.guild!.id,
          client,
        );

        if (restrictions.length === 0) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(icons.ban + " " + client.i18n.t("commands.restrictcommand.none")),
              ),
            ],
          });

          return;
        }

        const grouped = new Map<string, string[]>();

        for (const restriction of restrictions) {
          const list = grouped.get(restriction.command) ?? [];

          list.push(restriction.roleId);

          grouped.set(restriction.command, list);
        }

        const lines: string[] = [];

        for (const [command, roleIds] of grouped) {
          const roles = roleIds
            .map((id) => {
              const role = message.guild!.roles.cache.get(id);

              return role ? `**${role.name}**` : `\`${id}\``;
            })
            .join(", ");

          lines.push(`\`${command}\`: ${roles}`);
        }

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                `${client.i18n.t(
                  "commands.restrictcommand.list_title",
                )}\n\n${lines.join("\n")}`,
              ),
            ),
          ],
        });
      },
    }),
  ],
});
