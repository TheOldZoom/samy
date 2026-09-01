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

export function ServerAvatar(
  client: Client,
  target: User,
  member?: GuildMember | null,
) {
  const serverAvatarURL = member?.avatarURL({ size: 1024 });

  if (!serverAvatarURL) {
    return errorUI(
      icons.image +
        " " +
        client.i18n.t("commands.serveravatar.none", { user: target.username }),
    );
  }

  return new Container()
    .text(
      Text(
        `**${client.i18n.t("commands.serveravatar.title", { user: target.username })}**`,
      ),
    )
    .media(Media(serverAvatarURL))
    .separator(Separator())
    .actionRow(
      ActionRow(
        Buttons.link(client.i18n.t("general.browser"), serverAvatarURL),
      ),
    );
}
