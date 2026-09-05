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

export async function renderCasesList(
  client: Client,
  guild: Guild,
  invokerId: string,
  page: number,
  targetId?: string,
): Promise<Container> {
  const where: Record<string, unknown> = { guildId: guild.id };
  const resolvedTarget = decodeTarget(targetId);
  if (resolvedTarget) where.userId = resolvedTarget;

  const total = await client.prisma.moderationCase.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageIndex = Math.min(Math.max(0, page), totalPages - 1);

  const cases = await client.prisma.moderationCase.findMany({
    where,
    orderBy: { caseNumber: "desc" },
    skip: pageIndex * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const t = client.i18n.t.bind(client.i18n);

  if (cases.length === 0) {
    return new Container().text(
      Text(
        `${icons.list} ${
          resolvedTarget
            ? t("commands.cases.none_user", { user: `<@${resolvedTarget}>` })
            : t("commands.cases.none")
        }`,
      ),
    );
  }

  const lines: string[] = [];
  const options: { label: string; value: string; description?: string }[] = [];

  for (const modCase of cases) {
    const userTag = await fetchTag(guild, modCase.userId);

    lines.push(
      `**#${modCase.caseNumber}** ${modCase.type} · ${userTag} · <t:${Math.floor(
        modCase.createdAt.getTime() / 1000,
      )}:R>`,
    );

    options.push({
      label: `#${modCase.caseNumber} · ${modCase.type}`.slice(0, 100),
      value: String(modCase.caseNumber),
      description: userTag.slice(0, 100),
    });
  }

  const title = resolvedTarget
    ? t("commands.cases.title_user", {
        user: `<@${resolvedTarget}>`,
        count: String(total),
      })
    : t("commands.cases.title", { count: String(total) });

  const targetParam = encodeTarget(targetId);

  return new Container()
    .text(Text(`${icons.list} ${title}`))
    .separator(Separator())
    .text(Text(lines.join("\n")))
    .actionRow(
      ActionRow(
        SelectMenu({
          customId: `cases::select::${pageIndex}::${targetParam}::${invokerId}`,
          placeholder: t("commands.cases.select_placeholder"),
          options,
        }),
      ),
    )
    .actionRow(
      ActionRow(
        Button({
          emoji: icons.leftarrow,
          label: " ",
          customId: `cases::page::${pageIndex - 1}::${targetParam}::${invokerId}`,
          style: ButtonStyle.Secondary,
          disabled: pageIndex === 0,
        }),
        Button({
          label: t("commands.cases.page_indicator", {
            current: pageIndex + 1,
            total: totalPages,
          }),
          customId: `cases::noop::${invokerId}`,
          style: ButtonStyle.Secondary,
          disabled: true,
        }),
        Button({
          emoji: icons.rightarrow,
          label: " ",
          customId: `cases::page::${pageIndex + 1}::${targetParam}::${invokerId}`,
          style: ButtonStyle.Secondary,
          disabled: pageIndex >= totalPages - 1,
        }),
      ),
    );
}

export async function renderCaseDetail(
  client: Client,
  guild: Guild,
  invokerId: string,
  caseNumber: number,
  page: number,
  targetId?: string,
): Promise<Container | null> {
  const modCase = await client.prisma.moderationCase.findUnique({
    where: {
      guildId_caseNumber: {
        guildId: guild.id,
        caseNumber,
      },
    },
  });

  if (!modCase) return null;

  const t = client.i18n.t.bind(client.i18n);

  const userTag = await fetchTag(guild, modCase.userId);
  const moderatorTag = await fetchTag(guild, modCase.moderatorId);

  const details = [
    `**Case #${modCase.caseNumber}** · ${modCase.type}`,
    `**User:** ${userTag}`,
    `**Moderator:** ${moderatorTag}`,
    `**Reason:** ${modCase.reason ?? t("commands.cases.no_reason")}`,
  ];

  if (modCase.duration) {
    details.push(`**Duration:** ${modCase.duration}ms`);
  }

  if (modCase.resolved) {
    details.push(
      `**Resolved:** Yes by ${modCase.resolvedBy} <t:${Math.floor(
        (modCase.resolvedAt?.getTime() ?? 0) / 1000,
      )}:R>`,
    );
  }

  details.push(
    `**Created:** <t:${Math.floor(modCase.createdAt.getTime() / 1000)}:R>`,
  );

  return new Container()
    .text(Text(details.join("\n")))
    .actionRow(
      ActionRow(
        Buttons.secondary(
          t("commands.cases.back"),
          `cases::page::${Math.max(0, page)}::${encodeTarget(targetId)}::${invokerId}`,
        ),
      ),
    );
}
