import { PermissionFlagsBits } from "discord.js";

import InteractionHandler from "@/interaction/Handler";
import prisma from "@/libs/Prisma";
import { Container, Text, v2 } from "@/utils/ui/components";

const TEXT_LIMIT = 4_000;

export default new InteractionHandler({
  feature: "config",
  action: "message",

  async execute(_client, interaction, component) {
    if (
      !interaction.isButton() ||
      !interaction.guildId ||
      !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
      !component.id
    ) {
      return;
    }

    const [kind, channelId] = component.id.split(".");

    if (!channelId || (kind !== "welcome" && kind !== "leave")) {
      return;
    }

    const record =
      kind === "welcome"
        ? await prisma.welcome.findUnique({
            where: {
              guildId_channelId: {
                guildId: interaction.guildId,
                channelId,
              },
            },
          })
        : await prisma.leave.findUnique({
            where: {
              guildId_channelId: {
                guildId: interaction.guildId,
                channelId,
              },
            },
          });

    if (!record) {
      await interaction.reply({
        ...v2(
          new Container().text(Text("That configuration no longer exists.")),
        ),
        ephemeral: true,
      });
      return;
    }

    const chunks = record.message.match(
      new RegExp(`.{1,${TEXT_LIMIT}}`, "gs"),
    ) ?? [record.message];

    await interaction.reply({
      ...v2(new Container().text(...chunks.map((chunk) => Text(chunk)))),
      ephemeral: true,
      allowedMentions: { parse: [] },
    });
  },
});
