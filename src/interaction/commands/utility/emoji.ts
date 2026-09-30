import { ApplicationCommandOptionType } from "discord.js";
import Command from "@/classes/Command";
import {
  ActionRow,
  Buttons,
  Container,
  Media,
  Separator,
  Text,
  v2,
} from "@/utils/ui/components";
import { icons } from "@/utils/icons";

const CUSTOM_EMOJI = /^<(a)?:(\w+):(\d{15,20})>$/;

export default new Command({
  name: "emoji",
  description: "Enlarge a custom emoji.",
  ephemeral: true,
  everywhere: true,
  options: [
    {
      name: "emoji",
      description: "The emoji to enlarge.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],

  async execute(client, interaction) {
    const raw = (
      interaction.getOptionValue(
        "emoji",
        ApplicationCommandOptionType.String,
      ) ?? ""
    ).trim();

    const mention = raw.match(CUSTOM_EMOJI);
    const animated = Boolean(mention?.[1]);
    const id = mention?.[3] ?? (/^\d{15,20}$/.test(raw) ? raw : undefined);

    if (!id) {
      await interaction.reply(
        v2(new Container().text(Text("Emoji is not valid."))),
      );
      return;
    }

    const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}?size=256`;

    await interaction.reply(
      v2(
        new Container()
          .media(Media(url))
          .separator(Separator())
          .actionRow(
            ActionRow(Buttons.link("Open in browser", url, icons.link)),
          ),
      ),
    );
  },
});
