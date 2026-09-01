import type { Guild } from "discord.js";

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

export function GuildIcon(client: Client, guild: Guild) {
  const iconURL = guild.iconURL({ size: 1024 });

  if (!iconURL) {
    return errorUI(
      icons.image + " " + client.i18n.t("commands.guildicon.none"),
    );
  }

  return new Container()
    .text(
      Text(
        icons.image +
          " " +
          client.i18n.t("commands.guildicon.title", { name: guild.name }),
      ),
    )
    .media(Media(iconURL))
    .separator(Separator())
    .actionRow(
      ActionRow(Buttons.link(client.i18n.t("general.browser"), iconURL)),
    );
}
