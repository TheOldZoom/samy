import { icons } from "@/utils/icons";
import type Client from "@/classes/client";
import { Container, Text } from "@/ui/components";
import errorUI from "@/ui/error";

export function CharInfoResult(client: Client, input: string) {
  const char = input[0];

  if (!char) {
    return errorUI(icons.info + " " + client.i18n.t("commands.charinfo.provide"));
  }

  const codePoint = char.codePointAt(0)!;
  const hex = codePoint.toString(16).toUpperCase().padStart(4, "0");
  const utf8 = encodeURIComponent(char)
    .replace(/%/g, " ")
    .trim()
    .split(" ")
    .map((h) => h.toUpperCase())
    .join(" ");

  return new Container().text(
    Text(icons.info + " " + client.i18n.t("commands.charinfo.result", {
        char,
        hex,
        decimal: codePoint.toString(),
        utf8: utf8 || "—",
      }),
    ),
  );
}
