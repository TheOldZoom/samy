import { ButtonStyle } from "discord.js";
import prisma from "@/libs/Prisma";
import { icons } from "@/utils/icons";
import {
  ActionRow,
  Button,
  Buttons,
  Container,
  Separator,
  Text,
} from "@/utils/ui/components";

const PAGE_SIZE = 5;

type ListItem = {
  id: string;
  userId: string;
  description: string;
  createdAt: Date;
  removeId?: string;
};

function pageBounds(count: number, requestedPage: number) {
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const page = Math.min(Math.max(requestedPage, 0), pageCount - 1);

  return { page, pageCount };
}

function renderList(options: {
  feature: "cases" | "notes" | "warnings";
  icon: string;
  title: string;
  invokerId: string;
  targetId?: string;
  count: number;
  page: number;
  pageCount: number;
  items: ListItem[];
}) {
  const target = options.targetId ?? "_";
  const container = new Container().text(
    Text(`-# ${options.icon} · ${options.title}`),
    Text(
      [
        `-# ${options.targetId ? `<@${options.targetId}>` : "All members"}`,
        `-# ${options.count.toLocaleString()} ${options.count === 1 ? "record" : "records"} · Page ${options.page + 1} of ${options.pageCount}`,
      ].join("\n"),
    ),
  );

  if (options.items.length === 0) {
    container.text(Text("> No moderation records were found."));
  } else {
    container.text(
      Text(
        options.items
          .map((item, index) =>
            [
              `**${String(index + 1).padStart(2, "0")} · ${item.id}**`,
              `> ${icons.Person} <@${item.userId}> · <t:${Math.floor(item.createdAt.getTime() / 1000)}:R>`,
              `> ${item.description}`,
            ].join("\n"),
          )
          .join("\n\n"),
      ),
    );
  }

  const removableItems = options.items.filter((item) => item.removeId);
  if (removableItems.length) {
    container
      .separator(Separator())
      .actionRow(
        ActionRow(
          ...removableItems.map((item, index) =>
            Buttons.danger(
              `Remove ${index + 1}`,
              `${options.feature}:remove:${options.invokerId}.${item.removeId}.${options.page}.${target}`,
              icons.delete,
            ),
          ),
        ),
      );
  }

  container.separator(Separator()).actionRow(
    ActionRow(
      Button({
        label: "Previous",
        customId: `${options.feature}:page:${options.invokerId}.${options.page - 1}.${target}`,
        style: ButtonStyle.Secondary,
        disabled: options.page === 0,
        emoji: icons.leftarrow,
      }),
      Button({
        label: `${options.page + 1} / ${options.pageCount}`,
        customId: `${options.feature}:page-number:${options.invokerId}`,
        style: ButtonStyle.Secondary,
        disabled: true,
        emoji: options.icon,
      }),
      Button({
        label: "Next",
        customId: `${options.feature}:page:${options.invokerId}.${options.page + 1}.${target}`,
        style: ButtonStyle.Secondary,
        disabled: options.page + 1 >= options.pageCount,
        emoji: icons.rightarrow,
      }),
    ),
  );

  return container;
}

export async function renderCasesList(
  guildId: string,
  invokerId: string,
  requestedPage: number,
  targetId?: string,
) {
  const where = { guildId, ...(targetId ? { userId: targetId } : {}) };
  const count = await prisma.moderationCase.count({ where });
  const { page, pageCount } = pageBounds(count, requestedPage);
  const cases = await prisma.moderationCase.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return renderList({
    feature: "cases",
    icon: icons.list,
    title: "Moderation cases",
    invokerId,
    targetId,
    count,
    page,
    pageCount,
    items: cases.map((item) => ({
      id: `#${item.number} · ${item.type}`,
      userId: item.userId,
      description: item.reason,
      createdAt: item.createdAt,
    })),
  });
}

export async function renderWarningsList(
  guildId: string,
  invokerId: string,
  requestedPage: number,
  targetId?: string,
) {
  const where = { guildId, ...(targetId ? { userId: targetId } : {}) };
  const count = await prisma.warning.count({ where });
  const { page, pageCount } = pageBounds(count, requestedPage);
  const warnings = await prisma.warning.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return renderList({
    feature: "warnings",
    icon: icons.warning,
    title: "Warnings",
    invokerId,
    targetId,
    count,
    page,
    pageCount,
    items: warnings.map((warning) => ({
      id: warning.id.slice(-8),
      userId: warning.userId,
      description: warning.reason,
      createdAt: warning.createdAt,
      removeId: warning.id,
    })),
  });
}

export async function renderNotesList(
  guildId: string,
  invokerId: string,
  requestedPage: number,
  targetId?: string,
) {
  const where = { guildId, ...(targetId ? { userId: targetId } : {}) };
  const count = await prisma.memberNote.count({ where });
  const { page, pageCount } = pageBounds(count, requestedPage);
  const notes = await prisma.memberNote.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return renderList({
    feature: "notes",
    icon: icons.book,
    title: "Member notes",
    invokerId,
    targetId,
    count,
    page,
    pageCount,
    items: notes.map((note) => ({
      id: note.id.slice(-8),
      userId: note.userId,
      description: note.content,
      createdAt: note.createdAt,
      removeId: note.id,
    })),
  });
}
