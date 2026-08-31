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

const CUSTOM_EMOJI = /^<(a)?:(\w+):(\d{15,20})>$/;

export function JumboResult(client: Client, raw: string, guild?: Guild | null) {
  const mentionMatch = raw.match(CUSTOM_EMOJI);

  let id: string | undefined;
  let animated = false;

  if (mentionMatch) {
    animated = Boolean(mentionMatch[1]);
    id = mentionMatch[3];
  } else if (/^\d{15,20}$/.test(raw)) {
    id = raw;
  }

  if (id) {
    const extension = animated ? "gif" : "png";
    const url = `https://cdn.discordapp.com/emojis/${id}.${extension}?size=256`;

    return new Container()
      .media(Media(url))
      .separator(Separator())
      .actionRow(
        ActionRow(Buttons.link(client.i18n.t("general.browser"), url)),
      );
  }

  return errorUI(icons.image + " " + client.i18n.t("commands.jumbo.not_found"));
}
