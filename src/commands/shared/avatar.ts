import { type GuildMember, type User } from "discord.js";

import type Client from "@/classes/client";
import {
  ActionRow,
  Buttons,
  Container,
  Media,
  Separator,
  Text,
} from "@/ui/components";

export function Avatar(
  client: Client,
  target: User,
  member?: GuildMember | null,
) {
  const avatarURL =
    member?.avatarURL({ size: 1024 }) ??
    target.displayAvatarURL({ size: 1024 });

  return new Container()
    .text(
      Text(
        `**${client.i18n.t("commands.avatar.title", { user: target.username })}**`,
      ),
    )
    .media(Media(avatarURL))
    .separator(Separator())
    .actionRow(
      ActionRow(Buttons.link(client.i18n.t("general.browser"), avatarURL)),
    );
}
