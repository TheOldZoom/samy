import { ApplicationCommandOptionType } from "@discordjs/core";
import figlet from "figlet";

import Command, { Subcommand, SubcommandGroup } from "@/classes/Command";
import { icons } from "@/utils/icons";
import { Container, Text, v2 } from "@/utils/ui/components";

const textOption = {
  name: "text",
  description: "The text to transform",
  type: ApplicationCommandOptionType.String,
  required: true,
} as const;

const base64Encode = new Subcommand({
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
          Text(`-# ${icons.fingerprint} Base64 encoded`),
          Text(`\`\`\`\n${encoded}\n\`\`\``),
        ),
      ),
    );
  },
});

const base64Decode = new Subcommand({
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
          Text(`-# ${icons.fingerprint} Base64 decoded`),
          Text(`\`\`\`\n${decoded}\n\`\`\``),
        ),
      ),
    );
  },
});

const base64 = new SubcommandGroup({
  name: "base64",
  description: "Encode or decode Base64 text",
  subcommands: [base64Encode, base64Decode],
});

const hash = new Subcommand({
  name: "hash",
  description: "Generate a hash from text",
  options: [
    textOption,
    {
      name: "algorithm",
      description: "The hashing algorithm to use",
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: "SHA-256", value: "sha256" },
        { name: "SHA-384", value: "sha384" },
        { name: "SHA-512", value: "sha512" },
        { name: "MD5", value: "md5" },
      ],
    },
  ],
  ephemeral: true,

  async execute(client, interaction) {
    const text = interaction.getOptionValue(
      "text",
      ApplicationCommandOptionType.String,
    );

    if (text === undefined) return;

    const algorithm = (interaction.getOptionValue(
      "algorithm",
      ApplicationCommandOptionType.String,
    ) ?? "sha256") as "sha256" | "sha384" | "sha512" | "md5";

    const hash = new Bun.CryptoHasher(algorithm);
    hash.update(text);

    const digest = hash.digest("hex");

    await interaction.reply(
      v2(
        new Container().text(
          Text(`-# ${icons.fingerprint} Text hash`),
          Text(
            `> **Algorithm:** \`${algorithm.toUpperCase()}\`\n> **Hash:** \`${digest}\``,
          ),
        ),
      ),
    );
  },
});

const reverse = new Subcommand({
  name: "reverse",
  description: "Reverse text",
  options: [textOption],
  ephemeral: true,

  async execute(client, interaction) {
    const text = interaction.getOptionValue(
      "text",
      ApplicationCommandOptionType.String,
    );

    if (text === undefined) return;

    const reversed = [...text].reverse().join("");

    await interaction.reply(
      v2(
        new Container().text(
          Text(`-# ${icons.backforward} Reversed text`),
          Text(`\`\`\`\n${reversed}\n\`\`\``),
        ),
      ),
    );
  },
});

const mock = new Subcommand({
  name: "mock",
  description: "Convert text to mock text",
  options: [textOption],
  ephemeral: true,

  async execute(client, interaction) {
    const text = interaction.getOptionValue(
      "text",
      ApplicationCommandOptionType.String,
    );

    if (text === undefined) return;

    let upper = false;

    const mocked = [...text]
      .map((char) => {
        if (!/[a-z]/i.test(char)) return char;

        upper = !upper;

        return upper ? char.toUpperCase() : char.toLowerCase();
      })
      .join("");

    await interaction.reply(
      v2(
        new Container().text(
          Text(`-# ${icons.magicwand} Mock text`),
          Text(`\`\`\`\n${mocked}\n\`\`\``),
        ),
      ),
    );
  },
});

const ascii = new Subcommand({
  name: "ascii",
  description: "Convert text to ASCII art",
  options: [textOption],
  ephemeral: true,

  async execute(client, interaction) {
    const text = interaction.getOptionValue(
      "text",
      ApplicationCommandOptionType.String,
    );

    if (text === undefined) return;

    const art = figlet.textSync(text);

    await interaction.reply(
      v2(
        new Container().text(
          Text(`-# ${icons.heart} ASCII art`),
          Text(`\`\`\`\n${art}\n\`\`\``),
        ),
      ),
    );
  },
});

export default new Command({
  name: "text",
  description: "Encode and transform text",
  everywhere: true,
  subcommandGroups: [base64],
  subcommands: [hash, reverse, mock, ascii],
});
