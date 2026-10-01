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
  action: "avatar",

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

    const member = interaction.guild
      ? await interaction.guild.members.fetch(userId).catch(() => null)
      : null;
    const serverAvatar = member?.avatar ?? null;
    const source = member && serverAvatar ? member : user;
    const animated = (serverAvatar ?? user.avatar)?.startsWith("a_") ?? false;
    const link = (extension: "png" | "jpg" | "webp" | "gif") =>
      source.displayAvatarURL({
        extension,
        size: 4096,
        forceStatic: extension !== "gif",
      });
    const buttons = [
      Buttons.link("PNG", link("png"), icons.png),
      Buttons.link("JPG", link("jpg"), icons.jpg),
      Buttons.link("WEBP", link("webp"), icons.webp),
    ];

    if (animated) buttons.push(Buttons.link("GIF", link("gif"), icons.gif));
    if (user.banner)
      buttons.push(
        Buttons.secondary("Banner", `user:banner:${user.id}`, icons.image),
      );

    const name = escapeMarkdown(
      member?.displayName ?? user.globalName ?? user.username,
    );
    const container = new Container()
      .text(
        Text(
          `-# ${icons.Person} · **${name}**'s avatar${serverAvatar ? " · server" : ""}`,
        ),
      )
      .media(Media(link("png")))
      .actionRow(ActionRow(...buttons));

    await interaction.reply({
      ...v2(container),
      ephemeral: true,
      allowedMentions: { parse: [] },
    });
  },
});
