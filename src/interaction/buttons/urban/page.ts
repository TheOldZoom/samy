import InteractionHandler from "@/interaction/Handler";
import { response } from "@/utils/moderation";
import { buildUrbanView, getUrbanSearch } from "@/utils/urban";
import { v2 } from "@/utils/ui/components";

export default new InteractionHandler({
  feature: "urban",
  action: "page",

  async execute(_client, interaction, component) {
    if (!interaction.isButton() || !component.id) return;

    const [invokerId, pageValue, token] = component.id.split(".");

    if (!invokerId || interaction.user.id !== invokerId) {
      await interaction.reply(
        response(
          "Only the person who ran this command can change pages.",
          true,
        ),
      );
      return;
    }

    const definitions = token ? getUrbanSearch(token) : null;

    if (!token || !definitions) {
      await interaction.reply(
        response("This search has expired. Run /urban again.", true),
      );
      return;
    }

    await interaction.updateMessage({
      ...v2(
        buildUrbanView(definitions, Number(pageValue) || 0, token, invokerId),
      ),
      allowedMentions: { parse: [] },
    });
  },
});
