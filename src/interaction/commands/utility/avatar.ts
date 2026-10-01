import { ApplicationCommandOptionType, escapeMarkdown } from "discord.js";
import Command from "@/classes/Command";
import { icons } from "@/utils/icons";
import {
  ActionRow,
  Buttons,
  Container,
  Media,
  Text,
  v2,
} from "@/utils/ui/components";

export default new Command({
  name: "avatar",
  description: "Shows a user's avatar",
  everywhere: true,
  ephemeral: true,
  options: [
    {
      name: "user",
      description: "The user to look up (defaults to you)",
      type: ApplicationCommandOptionType.User,
    },
    {
      name: "global",
      description: "Show the global avatar instead of the server avatar",
      type: ApplicationCommandOptionType.Boolean,
    },
  ],

  async execute(client, interaction) {
    await interaction.defer();

    const targetId =
      interaction.getOptionValue("user", ApplicationCommandOptionType.User) ??
      interaction.user.id;
    const showGlobal =
      interaction.getOptionValue(
        "global",
        ApplicationCommandOptionType.Boolean,
      ) ?? false;

    const user = await client.users
      .fetch(targetId, { force: true })
      .catch(() => null);

    if (!user) {
      await interaction.reply(
        v2(new Container().text(Text("Couldn't find that user."))),
      );
      return;
    }

    const member =
      !showGlobal && interaction.guild
        ? await interaction.guild.members.fetch(targetId).catch(() => null)
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

    const displayName = escapeMarkdown(
      member?.displayName ?? user.globalName ?? user.username,
    );

    const buttons = [
      Buttons.link("PNG", link("png"), icons.png),
      Buttons.link("JPG", link("jpg"), icons.jpg),
      Buttons.link("WEBP", link("webp"), icons.webp),
    ];

    if (animated) buttons.push(Buttons.link("GIF", link("gif"), icons.gif));
    buttons.push(
      Buttons.secondary("Banner", `user:banner:${user.id}`, icons.image),
    );

    await interaction.reply({
      ...v2(
        new Container()
          .text(
            Text(
              `-# ${icons.Person} · **${displayName}**'s avatar${serverAvatar ? " · server" : ""}`,
            ),
          )
          .media(
            Media(source.displayAvatarURL({ size: 1024, extension: "png" })),
          )
          .actionRow(ActionRow(...buttons)),
      ),
      allowedMentions: { parse: [] },
    });
  },
});
