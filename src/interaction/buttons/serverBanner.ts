import InteractionHandler from "@/interaction/Handler";
import { Container, Media, Text, v2 } from "@/utils/ui/components";

export default new InteractionHandler({
  feature: "server",
  action: "banner",

  async execute(client, interaction, component) {
    if (!interaction.isMessageComponent() || !component.id) return;

    const guild = await client.guilds.fetch(component.id).catch(() => null);
    const banner = guild?.bannerURL({ size: 1024, extension: "png" });

    await interaction.reply({
      ...v2(
        banner
          ? new Container().media(Media(banner))
          : new Container().text(Text("This server doesn't have a banner.")),
      ),
      ephemeral: true,
    });
  },
});
