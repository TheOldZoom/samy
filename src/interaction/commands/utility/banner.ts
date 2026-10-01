import { ApplicationCommandOptionType, escapeMarkdown } from "discord.js";
import Command from "@/classes/Command";
import { icons } from "@/utils/icons";
import { renderColorBanner } from "@/utils/ui/cards/banner";
import {
  ActionRow,
  Buttons,
  Container,
  Media,
  Text,
  v2,
} from "@/utils/ui/components";

export default new Command({
  name: "banner",
  description: "Shows a user's profile banner",
  everywhere: true,
  ephemeral: true,
  options: [
    {
      name: "user",
      description: "The user to look up (defaults to you)",
      type: ApplicationCommandOptionType.User,
    },
  ],

  async execute(client, interaction) {
    await interaction.defer();

    const targetId =
      interaction.getOptionValue("user", ApplicationCommandOptionType.User) ??
      interaction.user.id;

    const user = await client.users
      .fetch(targetId, { force: true })
      .catch(() => null);

    if (!user) {
      await interaction.reply(
        v2(new Container().text(Text("Couldn't find that user."))),
      );
      return;
    }

    const name = escapeMarkdown(user.globalName ?? user.username);
    const avatarButton = Buttons.secondary(
      "Avatar",
      `user:avatar:${user.id}`,
      icons.Person,
    );

    if (!user.banner) {
      const banner = await renderColorBanner(user.id, user.accentColor);

      await interaction.reply({
        files: [{ name: "banner.png", attachment: banner.data }],
        ...v2(
          new Container()
            .text(
              Text(
                `-# ${icons.image} · **${name}**'s banner · \`${banner.color}\``,
              ),
            )
            .media(Media("attachment://banner.png"))
            .actionRow(ActionRow(avatarButton)),
        ),
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
          .media(Media(user.bannerURL({ size: 1024, extension: "png" })!))
          .actionRow(ActionRow(...buttons)),
      ),
      allowedMentions: { parse: [] },
    });
  },
});
