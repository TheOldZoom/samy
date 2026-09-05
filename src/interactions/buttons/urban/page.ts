import { MessageFlags } from "discord.js";

import { ButtonHandler } from "@/classes/Interaction";
import type { UrbanDefinition } from "@/commands/shared/urban";
import { buildUrbanView } from "@/commands/shared/urban";
import { Container, Text } from "@/ui/components";
import { icons } from "@/utils/icons";

export default new ButtonHandler({
  namespace: "urban",
  action: "page",

  async execute(client, interaction, params, invokerId) {
    const page = Number(params[0] ?? 0);
    const query = decodeURIComponent(params[1] ?? "");

    if (!query) {
      await interaction.update({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [
          new Container().text(
            Text(
              icons.Wrong + " " + client.i18n.t("commands.urban.fetch_error"),
            ),
          ),
        ],
      });
      return;
    }

    try {
      const response = await fetch(
        `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(query)}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as { list: UrbanDefinition[] };

      if (!data.list.length) {
        await interaction.update({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [
            new Container().text(
              Text(client.i18n.t("commands.urban.no_results", { query })),
            ),
          ],
        });
        return;
      }

      const container = buildUrbanView(data.list, page, query, invokerId);

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      client.logger.error("Failed to paginate Urban Dictionary definition", {
        error,
        query,
      });

      await interaction.update({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [
          new Container().text(
            Text(client.i18n.t("commands.urban.fetch_error")),
          ),
        ],
      });
    }
  },
});
