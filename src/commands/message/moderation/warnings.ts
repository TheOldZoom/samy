import { MessageFlags, type Message, type User } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import { renderWarningsList } from "@/ui/warnings";
import type Client from "@/classes/client";

const PAGE_SIZE = 10;

async function executeWarnings({
  message,
  client,
  target,
  page,
}: {
  message: Message;
  client: Client;
  target: User | undefined;
  page: number;
}): Promise<void> {
  if (!message.guild) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.warning + " " + client.i18n.t("commands.warnings.guild_only")),
        ),
      ],
    });

    return;
  }

  const userId = target?.id ?? message.author.id;

  const container = await renderWarningsList(
    client,
    message.guild,
    message.author.id,
    page,
    userId,
  );

  await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

async function findWarning(
  client: Client,
  guildId: string,
  userId: string,
  warningId: string,
) {
  let warning = await client.prisma.warning.findFirst({
    where: { guildId, userId, id: warningId },
  });

  if (!warning && warningId.length < 25) {
    warning = await client.prisma.warning.findFirst({
      where: { guildId, userId, id: { endsWith: warningId } },
    });
  }

  return warning;
}

async function executeRemove({
  message,
  client,
  target,
  warningId,
}: {
  message: Message;
  client: Client;
  target: User;
  warningId: string;
}): Promise<void> {
  if (!message.guild) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.warning + " " + client.i18n.t("commands.warnings.guild_only")),
        ),
      ],
    });

    return;
  }

  const warning = await findWarning(
    client,
    message.guild.id,
    target.id,
    warningId,
  );

  if (!warning) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.warning + " " + client.i18n.t("commands.warnings.remove.not_found", {
              user: target.tag,
            }),
          ),
        ),
      ],
    });

    return;
  }

  try {
    await client.prisma.warning.delete({ where: { id: warning.id } });

    const container = await renderWarningsList(
      client,
      message.guild,
      message.author.id,
      0,
      target.id,
    );

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.warning + " " + client.i18n.t("commands.warnings.remove.success", {
              id: warning.id.slice(-6),
              user: target.tag,
            }),
          ),
        ),
        container,
      ],
    });
  } catch {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.warning + " " + client.i18n.t("commands.warnings.remove.failed")),
        ),
      ],
    });
  }
}

async function executeClear({
  message,
  client,
  target,
}: {
  message: Message;
  client: Client;
  target: User;
}): Promise<void> {
  if (!message.guild) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.warning + " " + client.i18n.t("commands.warnings.guild_only")),
        ),
      ],
    });

    return;
  }

  const count = await client.prisma.warning.count({
    where: { guildId: message.guild.id, userId: target.id },
  });

  if (count === 0) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.warning + " " + client.i18n.t("commands.warnings.clear.none", {
              user: target.tag,
            }),
          ),
        ),
      ],
    });

    return;
  }

  try {
    await client.prisma.warning.deleteMany({
      where: { guildId: message.guild.id, userId: target.id },
    });

    const container = await renderWarningsList(
      client,
      message.guild,
      message.author.id,
      0,
      target.id,
    );

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.warning + " " + client.i18n.t("commands.warnings.clear.success", {
              count: String(count),
              user: target.tag,
            }),
          ),
        ),
        container,
      ],
    });
  } catch {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.warning + " " + client.i18n.t("commands.warnings.clear.failed")),
        ),
      ],
    });
  }
}

export default new MessageCommand({
  name: "warnings",
  description: "View and manage user warnings.",
  aliases: ["warninghistory", "warns"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ModerateMembers"],

  arguments: [
    {
      name: "user",
      aliases: ["u", "member", "target"],
      type: "user",
      description: "The user to view warnings for.",
      required: false,
    },
    {
      name: "page",
      aliases: ["p"],
      type: "integer",
      description: "Page number.",
      required: false,
      default: 1,
    },
  ],

  subcommands: [
    new MessageSubcommand({
      name: "remove",
      description: "Remove a specific warning from a user.",
      userPermissions: ["ModerateMembers"],
      arguments: [
        {
          name: "user",
          aliases: ["u", "member", "target"],
          type: "user",
          description: "The user to remove the warning from.",
          required: true,
        },
        {
          name: "warning_id",
          aliases: ["warning", "id"],
          type: "string",
          description: "The warning ID to remove.",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const target = args.getUser("user");
        const warningId = args.getString("warning_id");

        if (!target) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(icons.warning + " " + client.i18n.t("commands.warnings.remove.user_not_found")),
              ),
            ],
          });

          return;
        }

        if (!warningId) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(icons.warning + " " + client.i18n.t("commands.warnings.remove.missing_id")),
              ),
            ],
          });

          return;
        }

        await executeRemove({ client, message, target, warningId });
      },
    }),
    new MessageSubcommand({
      name: "clear",
      description: "Clear all warnings for a user.",
      userPermissions: ["ModerateMembers"],
      arguments: [
        {
          name: "user",
          aliases: ["u", "member", "target"],
          type: "user",
          description: "The user to clear warnings for.",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const target = args.getUser("user");

        if (!target) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(icons.warning + " " + client.i18n.t("commands.warnings.clear.user_not_found")),
              ),
            ],
          });

          return;
        }

        await executeClear({ client, message, target });
      },
    }),
  ],

  async execute(client, message, args) {
    const target = args.getUser("user");
    const page = Math.max(0, (args.getInteger("page") ?? 1) - 1);

    await executeWarnings({
      client,
      message,
      target,
      page,
    });
  },
});
