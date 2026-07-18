import { SeparatorBuilder, SeparatorSpacingSize } from "discord.js";

export function Separator(
  spacing = SeparatorSpacingSize.Small,
  divider = true,
) {
  return new SeparatorBuilder().setDivider(divider).setSpacing(spacing);
}
