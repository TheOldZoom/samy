import type { Guild } from "discord.js";

import { icons } from "@/utils/icons";
import { ButtonStyle } from "discord.js";

import type Client from "@/classes/client";
import {
  ActionRow,
  Button,
  Buttons,
  Container,
  SelectMenu,
  Separator,
  Text,
} from "@/ui/components";

const PAGE_SIZE = 10;

function encodeTarget(targetId?: string) {
  return targetId && targetId.length > 0 ? targetId : "_";
}

function decodeTarget(targetId: string | undefined) {
  return targetId && targetId !== "_" ? targetId : undefined;
}

async function fetchTag(guild: Guild, userId: string): Promise<string> {
  const member = await guild.members.fetch(userId).catch(() => null);

  return member?.user.tag ?? userId;
}

export async function renderNotesList(
  client: Client,
  guild: Guild,
  invokerId: string,
  page: number,
  targetId?: string,
): Promise<Container> {
  const userId = decodeTarget(targetId) ?? invokerId;

  const total = await client.prisma.memberNote.count({
    where: { guildId: guild.id, userId },
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageIndex = Math.min(Math.max(0, page), totalPages - 1);

  const notes = await client.prisma.memberNote.findMany({
    where: { guildId: guild.id, userId },
    orderBy: { createdAt: "desc" },
    skip: pageIndex * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const t = client.i18n.t.bind(client.i18n);
  const userTag = await fetchTag(guild, userId);

  if (notes.length === 0) {
    return new Container().text(
      Text(icons.book + " " + t("commands.notes.none_user", { user: userTag })),
    );
  }

  const lines: string[] = [];
  const options: { label: string; value: string; description?: string }[] = [];

  for (const note of notes) {
    const moderatorTag = await fetchTag(guild, note.moderatorId);

    lines.push(
      `**${note.id.slice(-6)}** · <t:${Math.floor(
        note.createdAt.getTime() / 1000,
      )}:R> · ${moderatorTag}\n-# ${
        note.content.length > 100
          ? note.content.slice(0, 100) + "…"
          : note.content
      }`,
    );

    options.push({
      label: `#${note.id.slice(-6)} · ${moderatorTag}`.slice(0, 100),
      value: note.id,
      description: note.content.slice(0, 100),
    });
  }

  const targetParam = encodeTarget(userId);

  return new Container()
    .text(
      Text(
        icons.book +
          " " +
          t("commands.notes.title", {
            user: userTag,
            count: String(total),
          }),
      ),
    )
    .separator(Separator())
    .text(Text(lines.join("\n\n")))
    .actionRow(
      ActionRow(
        SelectMenu({
          customId: `notes::select::${pageIndex}::${targetParam}::${invokerId}`,
          placeholder: t("commands.notes.select_placeholder"),
          options,
        }),
      ),
    )
    .actionRow(
      ActionRow(
        Button({
          emoji: icons.leftarrow,
          label: " ",
          customId: `notes::page::${pageIndex - 1}::${targetParam}::${invokerId}`,
          style: ButtonStyle.Secondary,
          disabled: pageIndex === 0,
        }),
        Button({
          label: t("commands.notes.page_indicator", {
            current: pageIndex + 1,
            total: totalPages,
          }),
          customId: `notes::noop::${invokerId}`,
          style: ButtonStyle.Secondary,
          disabled: true,
        }),
        Button({
          emoji: icons.rightarrow,
          label: " ",
          customId: `notes::page::${pageIndex + 1}::${targetParam}::${invokerId}`,
          style: ButtonStyle.Secondary,
          disabled: pageIndex >= totalPages - 1,
        }),
      ),
    );
}

export async function renderNoteDetail(
  client: Client,
  guild: Guild,
  invokerId: string,
  noteId: string,
  page: number,
  targetId?: string,
): Promise<Container | null> {
  const note = await client.prisma.memberNote.findFirst({
    where: { id: noteId, guildId: guild.id },
  });

  if (!note) return null;

  const t = client.i18n.t.bind(client.i18n);

  const userTag = await fetchTag(guild, note.userId);
  const moderatorTag = await fetchTag(guild, note.moderatorId);

  const details = [
    `**Note ${note.id.slice(-6)}**`,
    `**User:** ${userTag}`,
    `**Moderator:** ${moderatorTag}`,
    `**Content:** ${note.content ?? t("commands.notes.no_content")}`,
    `**Created:** <t:${Math.floor(note.createdAt.getTime() / 1000)}:R>`,
  ];

  return new Container()
    .text(Text(details.join("\n")))
    .actionRow(
      ActionRow(
        Buttons.secondary(
          t("commands.notes.back"),
          `notes::page::${Math.max(0, page)}::${encodeTarget(targetId)}::${invokerId}`,
        ),
        Buttons.danger(
          t("commands.notes.detail_remove"),
          `notes::remove::${note.id}::${Math.max(0, page)}::${encodeTarget(
            targetId,
          )}::${invokerId}`,
        ),
      ),
    );
}
