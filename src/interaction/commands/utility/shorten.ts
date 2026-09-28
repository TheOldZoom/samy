import { ApplicationCommandOptionType } from "@discordjs/core";

import Command from "@/classes/Command";
import { icons } from "@/utils/icons";
import { Container, Text, v2 } from "@/utils/ui/components";

type ShortenResponse = {
  shorturl?: string;
  errorcode?: number;
  errormessage?: string;
};

async function shorten(url: string): Promise<string> {
  const endpoint = new URL("https://is.gd/create.php");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("url", url);

  const response = await fetch(endpoint);
  const data = (await response.json()) as ShortenResponse;

  if (!response.ok || data.errorcode || !data.shorturl) {
    throw new Error(data.errormessage ?? "Failed to shorten URL");
  }

  return data.shorturl;
}

export default new Command({
  name: "shorten",
  description: "Shorten long URLs into shareable links",
  everywhere: true,

  options: [
    {
      name: "url",
      description: "The URL to shorten",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  cooldown: 60,
  dailyLimit: 10,
  ephemeral: true,

  async execute(client, interaction) {
    const input = interaction.getOptionValue(
      "url",
      ApplicationCommandOptionType.String,
    );

    if (typeof input !== "string") return;

    let url: URL;

    try {
      url = new URL(input);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      await interaction.reply(
        v2(
          new Container().text(
            Text(`-# ${icons.Wrong} URL shortener`),
            Text("Please provide a valid HTTP or HTTPS URL."),
          ),
        ),
      );
      return;
    }

    try {
      const shortUrl = await shorten(url.href);

      await interaction.reply(
        v2(
          new Container().text(
            Text(`-# ${icons.linkadd} URL shortened`),
            Text(
              `> Original: **${url.href}**\n` + `> Shortened: **${shortUrl}**`,
            ),
          ),
        ),
      );
    } catch {
      await interaction.reply(
        v2(
          new Container().text(
            Text(`-# ${icons.Wrong} URL shortener`),
            Text("Failed to shorten the URL. Please try again."),
          ),
        ),
      );
    }
  },
});
