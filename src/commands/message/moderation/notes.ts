import { MessageFlags, type Message, type User } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import { renderNoteDetail, renderNotesList } from "@/ui/notes";
import type Client from "@/classes/client";
import { ensureGuild } from "@/utils/guild";

const PAGE_SIZE = 10;

async function executeNotes({
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
        new Container().text(Text(icons.book + " " + client.i18n.t("commands.notes.guild_only"))),
      ],
    });

    return;
  }

  const userId = target?.id ?? message.author.id;

  const container = await renderNotesList(
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

async function executeAdd({
  message,
  client,
  target,
  content,
}: {
  message: Message;
  client: Client;
  target: User;
  content: string;
}): Promise<void> {
  if (!message.guild) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.book + " " + client.i18n.t("commands.notes.add.guild_only")),
        ),
      ],
    });

    return;
  }

  const member = message.guild.members.cache.get(target.id);

  if (!member) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.book + " " + client.i18n.t("commands.notes.add.not_in_guild")),
        ),
      ],
    });

    return;
  }

  try {
    await ensureGuild(message.guild.id);

    await client.prisma.memberNote.create({
      data: {
        guildId: message.guild.id,
        userId: target.id,
        moderatorId: message.author.id,
        content,
      },
    });

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.book + " " + client.i18n.t("commands.notes.add.success", {
              user: target.tag,
            }),
          ),
        ),
      ],
    });
  } catch {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(Text(icons.book + " " + client.i18n.t("commands.notes.add.failed"))),
      ],
    });
  }
}

async function findNote(
  client: Client,
  guildId: string,
  userId: string,
  noteId: string,
) {
  let note = await client.prisma.memberNote.findFirst({
    where: { guildId, userId, id: noteId },
  });

  if (!note && noteId.length < 25) {
    note = await client.prisma.memberNote.findFirst({
      where: { guildId, userId, id: { endsWith: noteId } },
    });
  }

  return note;
}

async function executeRemove({
  message,
  client,
  target,
  noteId,
}: {
  message: Message;
  client: Client;
  target: User;
  noteId: string;
}): Promise<void> {
  if (!message.guild) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(Text(icons.book + " " + client.i18n.t("commands.notes.guild_only"))),
      ],
    });

    return;
  }

  const note = await findNote(client, message.guild.id, target.id, noteId);

  if (!note) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.book + " " + client.i18n.t("commands.notes.remove.not_found", {
              user: target.tag,
            }),
          ),
        ),
      ],
    });

    return;
  }

  try {
    await client.prisma.memberNote.delete({ where: { id: note.id } });

    const container = await renderNotesList(
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
          Text(icons.book + " " + client.i18n.t("commands.notes.remove.success", {
              id: note.id.slice(-6),
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
          Text(icons.book + " " + client.i18n.t("commands.notes.remove.failed")),
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
        new Container().text(Text(icons.book + " " + client.i18n.t("commands.notes.guild_only"))),
      ],
    });

    return;
  }

  const count = await client.prisma.memberNote.count({
    where: { guildId: message.guild.id, userId: target.id },
  });

  if (count === 0) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.book + " " + client.i18n.t("commands.notes.clear.none", {
              user: target.tag,
            }),
          ),
        ),
      ],
    });

    return;
  }

  try {
    await client.prisma.memberNote.deleteMany({
      where: { guildId: message.guild.id, userId: target.id },
    });

    const container = await renderNotesList(
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
          Text(icons.book + " " + client.i18n.t("commands.notes.clear.success", {
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
          Text(icons.book + " " + client.i18n.t("commands.notes.clear.failed")),
        ),
      ],
    });
  }
}

export default new MessageCommand({
  name: "notes",
  description: "View and manage member notes.",
  aliases: ["note"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ModerateMembers"],

  arguments: [
    {
      name: "user",
      aliases: ["u", "member", "target"],
      type: "user",
      description: "The user to view notes for.",
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
      name: "add",
      description: "Add a note to a member.",
      userPermissions: ["ModerateMembers"],
      arguments: [
        {
          name: "user",
          aliases: ["u", "member", "target"],
          type: "user",
          description: "The member to add a note to.",
          required: true,
        },
        {
          name: "content",
          aliases: ["c", "note"],
          type: "string",
          description: "The note content.",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const target = args.getUser("user");
        const content = args.getString("content");
        if (!target) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(icons.book + " " + client.i18n.t("commands.notes.add.user_not_found")),
              ),
            ],
          });

          return;
        }

        if (!content) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(icons.book + " " + client.i18n.t("commands.notes.add.missing_content")),
              ),
            ],
          });

          return;
        }

        await executeAdd({ client, message, target, content });
      },
    }),
    new MessageSubcommand({
      name: "remove",
      description: "Remove a specific note from a user.",
      userPermissions: ["ModerateMembers"],
      arguments: [
        {
          name: "user",
          aliases: ["u", "member", "target"],
          type: "user",
          description: "The user to remove the note from.",
          required: true,
        },
        {
          name: "note_id",
          aliases: ["note", "id"],
          type: "string",
          description: "The note ID to remove.",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const target = args.getUser("user");
        const noteId = args.getString("note_id");

        if (!target) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(icons.book + " " + client.i18n.t("commands.notes.remove.user_not_found")),
              ),
            ],
          });

          return;
        }

        if (!noteId) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(icons.book + " " + client.i18n.t("commands.notes.remove.missing_id")),
              ),
            ],
          });

          return;
        }

        await executeRemove({ client, message, target, noteId });
      },
    }),
    new MessageSubcommand({
      name: "clear",
      description: "Clear all notes for a user.",
      userPermissions: ["ModerateMembers"],
      arguments: [
        {
          name: "user",
          aliases: ["u", "member", "target"],
          type: "user",
          description: "The user to clear notes for.",
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
                Text(icons.book + " " + client.i18n.t("commands.notes.clear.user_not_found")),
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

    await executeNotes({
      client,
      message,
      target,
      page,
    });
  },
});
