import { type GuildMember, type User } from "discord.js";

import { icons } from "@/utils/icons";

import type Client from "@/classes/client";
import {
  ActionRow,
  Buttons,
  Container,
  Media,
  Separator,
  Text,
} from "@/ui/components";
import errorUI from "@/ui/error";

export async function Banner(
  client: Client,
  target: User,
  member?: GuildMember | null,
) {
  const fetchedUser = await target.fetch(true);
  const fetchedMember = await member?.fetch(true).catch(() => null);

  const bannerURL =
    fetchedMember?.bannerURL({ size: 1024 }) ??
    fetchedUser.bannerURL({ size: 1024 });

  if (!bannerURL) {
    return errorUI(
      icons.image +
        " " +
        client.i18n.t("commands.banner.no_banner", {
          user: target.username,
        }),
    );
  }

  return new Container()
    .text(
      Text(
        `**${client.i18n.t("commands.banner.title", { user: target.username })}**`,
      ),
    )
    .media(Media(bannerURL))
    .separator(Separator())
    .actionRow(
      ActionRow(Buttons.link(client.i18n.t("general.browser"), bannerURL)),
    );
}
