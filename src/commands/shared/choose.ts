import { icons } from "@/utils/icons";
import type Client from "@/classes/client";
import { Container, Text } from "@/ui/components";
import errorUI from "@/ui/error";

export function ChooseResult(client: Client, options: string[]) {
  if (options.length < 2) {
    return errorUI(
      icons.spark + " " + client.i18n.t("commands.choose.provide_options"),
    );
  }

  const choice = options[Math.floor(Math.random() * options.length)]!;

  return new Container().text(
    Text(
      icons.spark + " " + client.i18n.t("commands.choose.result", { choice }),
    ),
  );
}
