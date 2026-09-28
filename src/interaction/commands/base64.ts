import { ApplicationCommandOptionType } from "@discordjs/core";

import Command, { Subcommand } from "@/classes/Command";
import { icons } from "@/utils/icons";
import { Container, Text, v2 } from "@/utils/ui/components";

const textOption = {
  name: "text",
  description: "The text to encode or decode",
  type: ApplicationCommandOptionType.String,
  required: true,
} as const;

const encode = new Subcommand({
  name: "encode",
  description: "Encodes text into Base64",
  options: [textOption],
  ephemeral: true,

  async execute(client, interaction) {
    const text = interaction.getOptionValue(
      "text",
      ApplicationCommandOptionType.String,
    );

    if (text === undefined) return;

    const encoded = Buffer.from(text, "utf8").toString("base64");

    await interaction.reply(
      v2(
        new Container().text(
          Text(`${icons.file} Base64 encoded`),
          Text(`\`\`\`\n${encoded}\n\`\`\``),
        ),
      ),
    );
  },
});

const decode = new Subcommand({
  name: "decode",
  description: "Decodes Base64 into text",
  options: [textOption],
  ephemeral: true,

  async execute(client, interaction) {
    const text = interaction.getOptionValue(
      "text",
      ApplicationCommandOptionType.String,
    );

    if (text === undefined) return;

    const decoded = Buffer.from(text, "base64").toString("utf8");

    await interaction.reply(
      v2(
        new Container().text(
          Text(`${icons.file} Base64 decoded`),
          Text(`\`\`\`\n${decoded}\n\`\`\``),
        ),
      ),
    );
  },
});

export default new Command({
  name: "base64",
  description: "Encode or decode Base64 text",
  everywhere: true,
  subcommands: [encode, decode],
});
