import { icons } from "@/utils/icons";
import type Client from "@/classes/client";
import { Container, Media, Text } from "@/ui/components";

export function RandomHexResult(client: Client) {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);

  const hex = `#${[r, g, b]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;

  const hexNoHash = hex.slice(1);

  return new Container()
    .text(
      Text(icons.colornitro + " " + client.i18n.t("commands.randomhex.result", {
          hex,
          r,
          g,
          b,
        }),
      ),
    )
    .media(Media(`https://singlecolorimage.com/get/${hexNoHash}/128x128`));
}
