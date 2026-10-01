import {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Message,
} from "discord.js";
import Command, { Subcommand } from "@/classes/Command";
import type { Interaction } from "@/classes/Interaction";
import { response } from "@/utils/moderation";

const MAX_AMOUNT = 500;
const FETCH_LIMIT = 100;
const BULK_DELETE_LIMIT = 100;
const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
const URL_PATTERN = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/i;

const amountOption = {
  name: "amount",
  description: "Number of messages to delete, from 1 to 500.",
  type: ApplicationCommandOptionType.Integer,
  min_value: 1,
  max_value: MAX_AMOUNT,
} as const;

async function purge(
  interaction: Interaction<ChatInputCommandInteraction>,
  filter?: (message: Message) => boolean,
) {
  if (!interaction.guild) return;
  await interaction.defer();

  const channel = interaction.channel;
  if (!channel?.isTextBased() || !("bulkDelete" in channel))
    return await interaction.reply(
      response("Messages can only be purged from a server text channel."),
    );

  const botMember = interaction.guild.members.me;
  if (
    !botMember ||
    !channel
      .permissionsFor(botMember)
      ?.has([
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ])
  )
    return await interaction.reply(
      response("I need Manage Messages and Read Message History here."),
    );

  const amount =
    interaction.getOptionValue(
      "amount",
      ApplicationCommandOptionType.Integer,
    ) ?? 10;
  const cutoff = Date.now() - FOURTEEN_DAYS;
  const messages: Message[] = [];
  let before: string | undefined;
  let reachedCutoff = false;

  while (messages.length < amount && !reachedCutoff) {
    const fetched = await channel.messages.fetch({
      limit: FETCH_LIMIT,
      ...(before ? { before } : {}),
    });
    if (!fetched.size) break;

    for (const message of fetched.values()) {
      if (message.createdTimestamp <= cutoff) {
        reachedCutoff = true;
        break;
      }
      if (!filter || filter(message)) messages.push(message);
      if (messages.length === amount) break;
    }

    const oldest = fetched.last();
    if (!oldest || fetched.size < FETCH_LIMIT) break;
    before = oldest.id;
  }

  if (!messages.length)
    return await interaction.reply(
      response("No matching messages from the last 14 days were found."),
    );

  let deleted = 0;
  for (let index = 0; index < messages.length; index += BULK_DELETE_LIMIT) {
    const batch = messages.slice(index, index + BULK_DELETE_LIMIT);
    deleted += (await channel.bulkDelete(batch, true)).size;
  }

  await interaction.reply(
    response(
      `Deleted **${deleted.toLocaleString()}** ${deleted === 1 ? "message" : "messages"} from ${channel}.`,
    ),
  );
}

function purgeSubcommand(
  name: string,
  description: string,
  filter?: (message: Message) => boolean,
) {
  return new Subcommand({
    name,
    description,
    ephemeral: true,
    options: [amountOption],
    async execute(_client, interaction) {
      await purge(interaction, filter);
    },
  });
}

export default new Command({
  name: "purge",
  description: "Delete multiple messages from a channel.",
  ephemeral: true,
  cooldown: 10,
  defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
  subcommands: [
    purgeSubcommand("all", "Delete recent messages."),
    new Subcommand({
      name: "user",
      description: "Delete messages from a specific user.",
      ephemeral: true,
      options: [
        {
          name: "user",
          description: "User whose messages should be deleted.",
          type: ApplicationCommandOptionType.User,
          required: true,
        },
        amountOption,
      ],
      async execute(_client, interaction) {
        const userId = interaction.getOptionValue(
          "user",
          ApplicationCommandOptionType.User,
        )!;
        await purge(interaction, (message) => message.author.id === userId);
      },
    }),
    purgeSubcommand("links", "Delete messages containing links.", (message) =>
      URL_PATTERN.test(message.content),
    ),
    purgeSubcommand(
      "bots",
      "Delete messages sent by bots.",
      (message) => message.author.bot,
    ),
    purgeSubcommand(
      "attachments",
      "Delete messages containing attachments.",
      (message) => message.attachments.size > 0,
    ),
    purgeSubcommand(
      "embeds",
      "Delete messages containing embeds.",
      (message) => message.embeds.length > 0,
    ),
  ],
});
