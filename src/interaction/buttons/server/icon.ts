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
  action: "icon",

  async execute(client, interaction, component) {
    if (!interaction.isMessageComponent() || !component.id) return;

    const guild = await client.guilds.fetch(component.id).catch(() => null);
    if (!guild?.icon) {
      await interaction.reply({
        ...v2(
          new Container().text(
            Text(`-# ${icons.image} · This server doesn't have an icon.`),
          ),
        ),
        ephemeral: true,
      });
      return;
    }

    const link = (extension: "png" | "jpg" | "webp" | "gif") =>
      guild.iconURL({
        extension,
        size: 4096,
        forceStatic: extension !== "gif",
      })!;
    const buttons = [
      Buttons.link("PNG", link("png"), icons.png),
      Buttons.link("JPG", link("jpg"), icons.jpg),
      Buttons.link("WEBP", link("webp"), icons.webp),
    ];

    if (guild.icon.startsWith("a_"))
      buttons.push(Buttons.link("GIF", link("gif"), icons.gif));
    buttons.push(
      Buttons.secondary("Banner", `server:banner:${guild.id}`, icons.image),
    );

    await interaction.reply({
      ...v2(
        new Container()
          .text(
            Text(
              `-# ${icons.image} · **${escapeMarkdown(guild.name)}**'s icon`,
            ),
          )
          .media(Media(link("png")))
          .actionRow(ActionRow(...buttons)),
      ),
      ephemeral: true,
      allowedMentions: { parse: [] },
    });
  },
});
