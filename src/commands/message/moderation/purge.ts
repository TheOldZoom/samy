import { MessageFlags, type Message } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import type Client from "@/classes/client";

const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/i;

const MAX_PURGE_AMOUNT = 500;
const BULK_DELETE_LIMIT = 100;
const FETCH_LIMIT = 100;
const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

async function executePurge({
  message,
  client,
  filterFn,
  amount,
}: {
  message: Message;
  client: Client;
  filterFn?: (msg: Message) => boolean;
  amount: number;
}): Promise<void> {
  const targetAmount = Math.min(Math.max(amount, 1), MAX_PURGE_AMOUNT);

  if (!message.channel.isTextBased() || !("bulkDelete" in message.channel)) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            icons.delete +
              " " +
              client.i18n.t("commands.purge.text_channel_only"),
          ),
        ),
      ],
    });

    return;
  }

  await message.delete().catch(() => {});

  const fourteenDaysAgo = Date.now() - FOURTEEN_DAYS;
  const toDelete: Message[] = [];

  let before: string | undefined;

  while (toDelete.length < targetAmount) {
    const fetched = await message.channel.messages.fetch({
      limit: FETCH_LIMIT,
      ...(before ? { before } : {}),
    });

    if (fetched.size === 0) {
      break;
    }

    for (const msg of fetched.values()) {
      if (msg.id === message.id) {
        continue;
      }

      if (msg.createdTimestamp <= fourteenDaysAgo) {
        break;
      }

      if (filterFn && !filterFn(msg)) {
        continue;
      }

      toDelete.push(msg);

      if (toDelete.length >= targetAmount) {
        break;
      }
    }

    if (toDelete.length >= targetAmount) {
      break;
    }

    const oldest = fetched.last();

    if (!oldest || oldest.createdTimestamp <= fourteenDaysAgo) {
      break;
    }

    before = oldest.id;

    if (fetched.size < FETCH_LIMIT) {
      break;
    }
  }

  if (toDelete.length === 0) {
    const response = await message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.delete + " " + client.i18n.t("commands.purge.none")),
        ),
      ],
    });

    setTimeout(() => {
      response.delete().catch(() => {});
    }, 4000);

    return;
  }

  let deletedCount = 0;

  for (let i = 0; i < toDelete.length; i += BULK_DELETE_LIMIT) {
    const batch = toDelete.slice(i, i + BULK_DELETE_LIMIT);

    const deleted = await message.channel.bulkDelete(batch, true);

    deletedCount += deleted.size;
  }

  const response = await message.channel.send({
    flags: MessageFlags.IsComponentsV2,
    components: [
      new Container().text(
        Text(
          icons.delete +
            " " +
            client.i18n.t("commands.purge.deleted", {
              count: deletedCount,
              noun: deletedCount === 1 ? "message" : "messages",
            }),
        ),
      ),
    ],
  });

  setTimeout(() => {
    response.delete().catch(() => {});
  }, 4000);
}

export default new MessageCommand({
  name: "purge",
  description: "Delete multiple messages from a channel.",
  aliases: ["clear", "c", "clean", "prune"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ManageMessages"],
  botPermissions: ["ManageMessages", "ReadMessageHistory"],

  arguments: [
    {
      name: "amount",
      aliases: ["a", "count"],
      type: "integer",
      description: "Number of messages to delete (1-500).",
      required: false,
      default: 10,
    },
  ],

  async execute(client, message, args) {
    await executePurge({
      client,
      message,
      amount: Math.min(args.getInteger("amount") ?? 10, MAX_PURGE_AMOUNT),
    });
  },

  subcommands: [
    new MessageSubcommand({
      name: "user",
      description: "Delete messages sent by a specific user.",
      aliases: ["member", "author"],
      userPermissions: ["ManageMessages"],
      botPermissions: ["ManageMessages", "ReadMessageHistory"],

      arguments: [
        {
          name: "user",
          aliases: ["u", "m", "member"],
          type: "user",
          description: "The user whose messages to delete.",
          required: true,
        },
        {
          name: "amount",
          aliases: ["a", "count"],
          type: "integer",
          description: "Number of messages to delete (1-500).",
          required: false,
          default: 10,
        },
      ],

      async execute(client, message, args) {
        const targetUser = args.getUser("user");

        if (!targetUser) {
          return;
        }

        await executePurge({
          client,
          message,
          amount: Math.min(args.getInteger("amount") ?? 10, MAX_PURGE_AMOUNT),
          filterFn: (msg) => msg.author.id === targetUser.id,
        });
      },
    }),

    new MessageSubcommand({
      name: "links",
      description: "Delete messages containing links/URLs.",
      aliases: ["link", "urls", "url"],
      userPermissions: ["ManageMessages"],
      botPermissions: ["ManageMessages", "ReadMessageHistory"],

      arguments: [
        {
          name: "amount",
          aliases: ["a", "count"],
          type: "integer",
          description: "Number of messages to delete (1-500).",
          required: false,
          default: 10,
        },
      ],

      async execute(client, message, args) {
        await executePurge({
          client,
          message,
          amount: Math.min(args.getInteger("amount") ?? 10, MAX_PURGE_AMOUNT),
          filterFn: (msg) => URL_REGEX.test(msg.content),
        });
      },
    }),

    new MessageSubcommand({
      name: "bots",
      description: "Delete messages sent by bots.",
      aliases: ["bot"],
      userPermissions: ["ManageMessages"],
      botPermissions: ["ManageMessages", "ReadMessageHistory"],

      arguments: [
        {
          name: "amount",
          aliases: ["a", "count"],
          type: "integer",
          description: "Number of messages to delete (1-500).",
          required: false,
          default: 10,
        },
      ],

      async execute(client, message, args) {
        await executePurge({
          client,
          message,
          amount: Math.min(args.getInteger("amount") ?? 10, MAX_PURGE_AMOUNT),
          filterFn: (msg) => msg.author.bot,
        });
      },
    }),

    new MessageSubcommand({
      name: "attachments",
      description: "Delete messages containing attachments.",
      aliases: ["attachment", "files", "file"],
      userPermissions: ["ManageMessages"],
      botPermissions: ["ManageMessages", "ReadMessageHistory"],

      arguments: [
        {
          name: "amount",
          aliases: ["a", "count"],
          type: "integer",
          description: "Number of messages to delete (1-500).",
          required: false,
          default: 10,
        },
      ],

      async execute(client, message, args) {
        await executePurge({
          client,
          message,
          amount: Math.min(args.getInteger("amount") ?? 10, MAX_PURGE_AMOUNT),
          filterFn: (msg) => msg.attachments.size > 0,
        });
      },
    }),

    new MessageSubcommand({
      name: "embeds",
      description: "Delete messages containing embeds.",
      aliases: ["embed"],
      userPermissions: ["ManageMessages"],
      botPermissions: ["ManageMessages", "ReadMessageHistory"],

      arguments: [
        {
          name: "amount",
          aliases: ["a", "count"],
          type: "integer",
          description: "Number of messages to delete (1-500).",
          required: false,
          default: 10,
        },
      ],

      async execute(client, message, args) {
        await executePurge({
          client,
          message,
          amount: Math.min(args.getInteger("amount") ?? 10, MAX_PURGE_AMOUNT),
          filterFn: (msg) => msg.embeds.length > 0,
        });
      },
    }),
  ],
});
