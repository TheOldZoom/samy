import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import { renderCaseDetail, renderCasesList } from "@/ui/cases";

export default new MessageCommand({
  name: "cases",
  description: "View and manage moderation cases.",
  aliases: ["case"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ModerateMembers"],

  arguments: [
    {
      name: "user",
      aliases: ["u", "member", "target"],
      type: "user",
      description: "The user to view cases for.",
      required: false,
    },
    {
      name: "case_number",
      aliases: ["case", "id", "number"],
      type: "string",
      description: "Specific case number to view.",
      required: false,
    },
    {
      name: "page",
      aliases: ["p"],
      type: "integer",
      description: "Page number.",
      required: false,
      default: 1,
    },
  ],

  async execute(client, message, args) {
    if (!message.guild) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.list + " " + client.i18n.t("commands.cases.guild_only")),
          ),
        ],
      });

      return;
    }

    const target = args.getUser("user");
    const caseNumber = args.getString("case_number");
    const invokerId = message.author.id;
    const page = Math.max(0, (args.getInteger("page") ?? 1) - 1);

    if (caseNumber) {
      const numericCase = Number(caseNumber);

      if (!Number.isInteger(numericCase)) {
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(icons.list + " " + client.i18n.t("commands.cases.not_found", { case: caseNumber }),
              ),
            ),
          ],
        });

        return;
      }

      const detail = await renderCaseDetail(
        client,
        message.guild,
        invokerId,
        numericCase,
        page,
        target?.id,
      );

      if (!detail) {
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(icons.list + " " + client.i18n.t("commands.cases.not_found", { case: caseNumber }),
              ),
            ),
          ],
        });

        return;
      }

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [detail],
      });

      return;
    }

    const container = await renderCasesList(
      client,
      message.guild,
      invokerId,
      page,
      target?.id,
    );

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
});
