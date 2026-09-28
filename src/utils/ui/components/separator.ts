import { SeparatorBuilder } from "@discordjs/builders";
import { SeparatorSpacingSize } from "@discordjs/core";

export function Separator(
  spacing = SeparatorSpacingSize.Small,
  divider = true,
) {
  return new SeparatorBuilder().setDivider(divider).setSpacing(spacing);
}
