import type { GuildMember, User } from "discord.js";

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

export async function ServerBanner(
  client: Client,
  target: User,
  member?: GuildMember | null,
) {
  const fetchedMember = await member?.fetch(true).catch(() => null);
  const serverBannerURL = fetchedMember?.bannerURL({ size: 1024 });

  if (!serverBannerURL) {
    return errorUI(
      icons.image +
        " " +
        client.i18n.t("commands.serverbanner.none", { user: target.username }),
    );
  }

  return new Container()
    .text(
      Text(
        `**${client.i18n.t("commands.serverbanner.title", { user: target.username })}**`,
      ),
    )
    .media(Media(serverBannerURL))
    .separator(Separator())
    .actionRow(
      ActionRow(
        Buttons.link(client.i18n.t("general.browser"), serverBannerURL),
      ),
    );
}
