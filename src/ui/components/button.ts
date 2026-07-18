import { ButtonBuilder, ButtonStyle } from "discord.js";

export function Button(options: {
  label: string;
  customId?: string;
  url?: string;
  style?: ButtonStyle;
  disabled?: boolean;
  emoji?: string;
}) {
  const button = new ButtonBuilder()
    .setLabel(options.label)
    .setDisabled(options.disabled ?? false);

  if (options.emoji) button.setEmoji(options.emoji);

  if (options.url) {
    button.setStyle(ButtonStyle.Link).setURL(options.url);
  } else {
    button
      .setStyle(options.style ?? ButtonStyle.Primary)
      .setCustomId(options.customId!);
  }

  return button;
}

export const Buttons = {
  primary: (label: string, id: string) =>
    Button({
      label,
      customId: id,
      style: ButtonStyle.Primary,
    }),

  secondary: (label: string, id: string) =>
    Button({
      label,
      customId: id,
      style: ButtonStyle.Secondary,
    }),

  success: (label: string, id: string) =>
    Button({
      label,
      customId: id,
      style: ButtonStyle.Success,
    }),

  danger: (label: string, id: string) =>
    Button({
      label,
      customId: id,
      style: ButtonStyle.Danger,
    }),

  link: (label: string, url: string) =>
    Button({
      label,
      url,
    }),
};
