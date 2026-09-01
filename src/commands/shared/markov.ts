import type { Message, MessageComponentInteraction } from "discord.js";

import { icons } from "@/utils/icons";
import { ComponentType, MessageFlags, SeparatorBuilder } from "discord.js";
import type Client from "@/classes/client";
import { ActionRow, Buttons, Container, Text } from "@/ui/components";
import errorUI from "@/ui/error";

export function MarkovGenerateResult(client: Client, sentence: string) {
  return new Container().text(
    Text(
      icons.message +
        " " +
        client.i18n.t("commands.markov.result", { sentence }),
    ),
  );
}

export function MarkovNoChainError(client: Client) {
  return errorUI(
    icons.message + " " + client.i18n.t("commands.markov.no_chain"),
  );
}

export function MarkovSeedNotFoundError(client: Client, seed: string) {
  return errorUI(
    icons.message +
      " " +
      client.i18n.t("commands.markov.seed_not_found", { seed }),
  );
}

export interface MarkovConfirmOptions {
  client: Client;
  message: Message;
  confirmText: string;
  onConfirm: (interaction: MessageComponentInteraction) => Promise<string>;
}

export async function confirmMarkovAction({
  client,
  message,
  confirmText,
  onConfirm,
}: MarkovConfirmOptions): Promise<void> {
  const confirmId = `markov-confirm:${message.id}`;
  const cancelId = `markov-cancel:${message.id}`;

  const row = ActionRow(
    Buttons.secondary(client.i18n.t("general.cancel"), cancelId),
    Buttons.danger(client.i18n.t("commands.markov.confirm"), confirmId),
  );

  const confirmation = await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      new Container()
        .text(Text(confirmText))
        .separator(new SeparatorBuilder().setDivider(true))
        .actionRow(row),
    ],
  });

  try {
    const interaction = await confirmation.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: 30_000,
      filter: (i) =>
        i.user.id === message.author.id &&
        (i.customId === confirmId || i.customId === cancelId),
    });

    if (interaction.customId === cancelId) {
      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.message + " " + client.i18n.t("commands.markov.cancelled"),
            ),
          ),
        ],
      });

      return;
    }

    try {
      const success = await onConfirm(interaction);

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [new Container().text(Text(success))],
      });
    } catch {
      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.message + " " + client.i18n.t("commands.markov.failed")),
          ),
        ],
      });
    }
  } catch {
    await confirmation.edit({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.message + " " + client.i18n.t("commands.markov.timeout")),
        ),
      ],
    });
  }
}
