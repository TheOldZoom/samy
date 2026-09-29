import InteractionHandler from "@/interaction/Handler";
import {
  ActionRow,
  Buttons,
  Container,
  Media,
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
    const user = await client.users.fetch(userId, { force: true });

    const avatar = user.displayAvatarURL({ size: 1024, extension: "png" });
    const banner = user.bannerURL({ size: 1024, extension: "png" });

    const container = new Container().media(Media(avatar));

    if (banner) {
      container.actionRow(
        ActionRow(
          Buttons.secondary("Banner", `user:banner:${user.id}`, icons.image),
        ),
      );
    }

    await interaction.reply({
      ...v2(container),
      ephemeral: true,
    });
  },
});
