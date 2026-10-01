import InteractionHandler from "@/interaction/Handler";
import { escapeMarkdown } from "discord.js";
import {
  ActionRow,
  Buttons,
  Container,
  Media,
  Text,
  v2,
} from "@/utils/ui/components";
import { icons } from "@/utils/icons";

export default new InteractionHandler({
  feature: "user",
  action: "banner",

  async execute(client, interaction, component) {
    if (!interaction.isMessageComponent() || !component.id) {
      return;
    }

    const userId = component.id;
    const user = await client.users
      .fetch(userId, { force: true })
      .catch(() => null);
    if (!user) {
      await interaction.reply({
        ...v2(new Container().text(Text("Couldn't find that user."))),
        ephemeral: true,
      });
      return;
    }

    const name = escapeMarkdown(user.globalName ?? user.username);
    const avatarButton = Buttons.secondary(
      "Avatar",
      `user:avatar:${user.id}`,
      icons.Person,
    );

    if (!user.banner) {
      await interaction.reply({
        ...v2(
          new Container()
            .text(
              Text(
                [
                  `-# ${icons.image} · **${name}** doesn't have a banner.`,
                  user.hexAccentColor
                    ? `Accent color: \`${user.hexAccentColor}\``
                    : "",
                ]
                  .filter(Boolean)
                  .join("\n"),
              ),
            )
            .actionRow(ActionRow(avatarButton)),
        ),
        ephemeral: true,
        allowedMentions: { parse: [] },
      });

      return;
    }

    const animated = user.banner.startsWith("a_");
    const link = (extension: "png" | "jpg" | "webp" | "gif") =>
      user.bannerURL({
        extension,
        size: 4096,
        forceStatic: extension !== "gif",
      })!;
    const buttons = [
      Buttons.link("PNG", link("png"), icons.png),
      Buttons.link("JPG", link("jpg"), icons.jpg),
      Buttons.link("WEBP", link("webp"), icons.webp),
    ];

    if (animated) buttons.push(Buttons.link("GIF", link("gif"), icons.gif));
    buttons.push(avatarButton);

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
