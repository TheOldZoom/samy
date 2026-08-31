import { Container, Text } from "@/ui/components";
import type Client from "@/classes/client";
import type { User } from "discord.js";

import { icons } from "@/utils/icons";

export function getGay(userId: string): number {
  let hash = 0;

  for (const char of userId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash % 102;
}

export function GayResult(client: Client, user: User) {
  const percentage = getGay(user.id);

  return new Container().addTextDisplayComponents(
    Text(icons.gay + " " + client.i18n.t("commands.gay.result", {
        user: user.username,
        percentage,
      }),
    ),
  );
}
