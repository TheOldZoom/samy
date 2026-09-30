import InteractionHandler from "@/interaction/Handler";
import { Container, Media, v2 } from "@/utils/ui/components";

export default new InteractionHandler({
  feature: "server",
  action: "icon",

  async execute(client, interaction, component) {
    if (!interaction.isMessageComponent() || !component.id) return;

    const guild = await client.guilds.fetch(component.id).catch(() => null);
    const icon = guild?.iconURL({ size: 1024, extension: "png" });
    if (!icon) return;

    await interaction.reply({
      ...v2(new Container().media(Media(icon))),
      ephemeral: true,
    });
  },
});
