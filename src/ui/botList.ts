import { ButtonStyle, type Guild } from "discord.js";

import { icons } from "@/utils/icons";

import type Client from "@/classes/client";
import {
  ActionRow,
  Button,
  Buttons,
  Container,
  Separator,
  Text,
} from "@/ui/components";

const PAGE_SIZE = 5;

function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(page, 0), totalPages - 1);
  const start = current * pageSize;

  return {
    pageItems: items.slice(start, start + pageSize),
    page: current,
    totalPages,
  };
}

function pageIndicator(
  client: Client,
  userId: string,
  page: number,
  totalPages: number,
) {
  return Button({
    label: client.i18n.t("commands.botlist.page_indicator", {
      current: page + 1,
      total: totalPages,
    }),
    customId: `botlist::noop::${userId}`,
    style: ButtonStyle.Secondary,
    disabled: true,
  });
}

export function buildBotListView(
  client: Client,
  userId: string,
  guild: Guild,
  page = 0,
) {
  const t = client.i18n.t.bind(client.i18n);
  const bots = [...guild.members.cache.filter((m) => m.user.bot).values()].sort(
    (a, b) => a.user.username.localeCompare(b.user.username),
  );

  const { pageItems, page: current, totalPages } = paginate(bots, page);

  const container = new Container()
    .text(
      Text(
        `${icons.bots} **${t("commands.botlist.title", { guild: guild.name, count: bots.length })}**`,
      ),
    )
    .separator(Separator())
    .text(
      Text(
        pageItems.length > 0
          ? pageItems
              .map((member) =>
                t("commands.botlist.entry", {
                  bot: `<@${member.id}>`,
                  joined: member.joinedTimestamp
                    ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
                    : t("commands.botlist.unknown"),
                }),
              )
              .join("\n")
          : t("commands.botlist.none"),
      ),
    );

  if (totalPages > 1) {
    container.actionRow(
      ActionRow(
        Buttons.secondary(
          "◀",
          `botlist::page::${current - 1}::${userId}`,
        ).setDisabled(current === 0),
        pageIndicator(client, userId, current, totalPages),
        Buttons.secondary(
          "▶",
          `botlist::page::${current + 1}::${userId}`,
        ).setDisabled(current >= totalPages - 1),
      ),
    );
  }

  return container;
}
