import {
  ComponentType,
  SeparatorSpacingSize,
  type APISeparatorComponent,
} from "discord.js";

export class SeparatorComponent {
  constructor(
    private readonly spacing: SeparatorSpacingSize,
    private readonly divider: boolean,
  ) {}

  toJSON(): APISeparatorComponent {
    return {
      type: ComponentType.Separator,
      divider: this.divider,
      spacing: this.spacing,
    };
  }
}

export function Separator(
  spacing = SeparatorSpacingSize.Small,
  divider = true,
) {
  return new SeparatorComponent(spacing, divider);
}
