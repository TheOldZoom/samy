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

export async function renderWarningsList(
  client: Client,
  guild: Guild,
  invokerId: string,
  page: number,
  targetId?: string,
): Promise<Container> {
  const userId = decodeTarget(targetId) ?? invokerId;

  const total = await client.prisma.warning.count({
    where: { guildId: guild.id, userId },
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageIndex = Math.min(Math.max(0, page), totalPages - 1);

  const warnings = await client.prisma.warning.findMany({
    where: { guildId: guild.id, userId },
    orderBy: { createdAt: "desc" },
    skip: pageIndex * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const t = client.i18n.t.bind(client.i18n);
  const userTag = await fetchTag(guild, userId);

  if (warnings.length === 0) {
    return new Container().text(
      Text(
        icons.warning +
          " " +
          t("commands.warnings.none_user", { user: userTag }),
      ),
    );
  }

  const lines: string[] = [];
  const options: { label: string; value: string; description?: string }[] = [];

  for (const warning of warnings) {
    const moderatorTag = await fetchTag(guild, warning.moderatorId);

    lines.push(
      `**${warning.id.slice(-6)}** · <t:${Math.floor(
        warning.createdAt.getTime() / 1000,
      )}:R> · ${moderatorTag}\n-# ${
        warning.reason.length > 100
          ? warning.reason.slice(0, 100) + "…"
          : warning.reason
      }`,
    );

    options.push({
      label: `#${warning.id.slice(-6)} · ${moderatorTag}`.slice(0, 100),
      value: warning.id,
      description: warning.reason.slice(0, 100),
    });
  }

  const targetParam = encodeTarget(userId);

  return new Container()
    .text(
      Text(
        icons.warning +
          " " +
          t("commands.warnings.title", {
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
          customId: `warnings::select::${pageIndex}::${targetParam}::${invokerId}`,
          placeholder: t("commands.warnings.select_placeholder"),
          options,
        }),
      ),
    )
    .actionRow(
      ActionRow(
        Buttons.secondary(
          icons.leftarrow,
          `warnings::page::${pageIndex - 1}::${targetParam}::${invokerId}`,
        ).setDisabled(pageIndex === 0),
        Button({
          label: t("commands.warnings.page_indicator", {
            current: pageIndex + 1,
            total: totalPages,
          }),
          customId: `warnings::noop::${invokerId}`,
          style: ButtonStyle.Secondary,
          disabled: true,
        }),
        Buttons.secondary(
          icons.rightarrow,
          `warnings::page::${pageIndex + 1}::${targetParam}::${invokerId}`,
        ).setDisabled(pageIndex >= totalPages - 1),
      ),
    );
}

export async function renderWarningDetail(
  client: Client,
  guild: Guild,
  invokerId: string,
  warningId: string,
  page: number,
  targetId?: string,
): Promise<Container | null> {
  const warning = await client.prisma.warning.findFirst({
    where: { id: warningId, guildId: guild.id },
  });

  if (!warning) return null;

  const t = client.i18n.t.bind(client.i18n);

  const userTag = await fetchTag(guild, warning.userId);
  const moderatorTag = await fetchTag(guild, warning.moderatorId);

  const details = [
    `**Warning ${warning.id.slice(-6)}**`,
    `**User:** ${userTag}`,
    `**Moderator:** ${moderatorTag}`,
    `**Reason:** ${warning.reason ?? t("commands.warnings.no_reason")}`,
    `**Created:** <t:${Math.floor(warning.createdAt.getTime() / 1000)}:R>`,
  ];

  return new Container()
    .text(Text(details.join("\n")))
    .actionRow(
      ActionRow(
        Buttons.secondary(
          t("commands.warnings.back"),
          `warnings::page::${Math.max(0, page)}::${encodeTarget(targetId)}::${invokerId}`,
        ),
        Buttons.danger(
          t("commands.warnings.detail_remove"),
          `warnings::remove::${warning.id}::${Math.max(0, page)}::${encodeTarget(
            targetId,
          )}::${invokerId}`,
        ),
      ),
    );
}
