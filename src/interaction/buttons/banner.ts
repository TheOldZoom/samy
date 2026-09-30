import InteractionHandler from "@/interaction/Handler";
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
    const user = await client.users.fetch(userId, { force: true });

    const banner = user.bannerURL({ size: 1024, extension: "png" });

    if (!banner) {
      await interaction.reply({
        ...v2(
          new Container().text(
            Text(`-# ${icons.image} · This user doesn't have a banner.`),
          ),
        ),
        ephemeral: true,
      });

      return;
    }

    await interaction.reply({
      ...v2(
        new Container()
          .media(Media(banner))
          .actionRow(
            ActionRow(
              Buttons.secondary(
                "Avatar",
                `user:avatar:${user.id}`,
                icons.Person,
              ),
            ),
          ),
      ),
      ephemeral: true,
    });
  },
});
