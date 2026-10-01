import InteractionHandler from "@/interaction/Handler";
import { escapeMarkdown } from "discord.js";
import { icons } from "@/utils/icons";
import {
  ActionRow,
  Buttons,
  Container,
  Media,
  Text,
  v2,
} from "@/utils/ui/components";

export default new InteractionHandler({
  feature: "server",
  action: "banner",

  async execute(client, interaction, component) {
    if (!interaction.isMessageComponent() || !component.id) return;

    const guild = await client.guilds.fetch(component.id).catch(() => null);
    if (!guild) return;

    const name = escapeMarkdown(guild.name);
    const iconButton = guild.icon
      ? Buttons.secondary("Icon", `server:icon:${guild.id}`, icons.image)
      : null;

    if (!guild.banner) {
      const container = new Container().text(
        Text(`-# ${icons.image} · **${name}** doesn't have a banner.`),
      );
      if (iconButton) container.actionRow(ActionRow(iconButton));

      await interaction.reply({
        ...v2(container),
        ephemeral: true,
        allowedMentions: { parse: [] },
      });
      return;
    }

    const link = (extension: "png" | "jpg" | "webp" | "gif") =>
      guild.bannerURL({
        extension,
        size: 4096,
        forceStatic: extension !== "gif",
      })!;
    const buttons = [
      Buttons.link("PNG", link("png"), icons.png),
      Buttons.link("JPG", link("jpg"), icons.jpg),
      Buttons.link("WEBP", link("webp"), icons.webp),
    ];

    if (guild.banner.startsWith("a_"))
      buttons.push(Buttons.link("GIF", link("gif"), icons.gif));
    if (iconButton) buttons.push(iconButton);

    await interaction.reply({
      ...v2(
        new Container()
          .text(Text(`-# ${icons.image} · **${name}**'s banner`))
          .media(Media(link("png")))
          .actionRow(ActionRow(...buttons)),
      ),
      ephemeral: true,
      allowedMentions: { parse: [] },
    });
  },
});
