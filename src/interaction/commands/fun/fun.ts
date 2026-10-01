import { ApplicationCommandOptionType, escapeMarkdown } from "discord.js";

import Command, { Subcommand } from "@/classes/Command";
import { randomCompatibilityScore } from "@/utils/fun";
import { icons } from "@/utils/icons";
import {
  failureResponse,
  fetchJson,
  imageResponse,
  textResponse,
} from "@/utils/randomContent";
import { renderShipCard } from "@/utils/ui/cards/ship";
import { Container, Media, Separator, Text, v2 } from "@/utils/ui/components";
import { cacheDiscordUsers } from "@/utils/userCache";

type CatImage = { url?: string };
type DogImage = { message?: string; status?: string };
type Fact = { text?: string };
type Joke = { setup?: string; punchline?: string };
type Meme = {
  postLink?: string;
  title?: string;
  url?: string;
  nsfw?: boolean;
  spoiler?: boolean;
};

async function getSafeMeme(): Promise<Meme> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const meme = await fetchJson<Meme>("https://meme-api.com/gimme");
    if (meme.url && !meme.nsfw && !meme.spoiler) return meme;
  }

  throw new Error("Meme API returned no safe meme");
}

export default new Command({
  name: "fun",
  description: "Fun commands and random content",
  everywhere: true,
  subcommands: [
    new Subcommand({
      name: "ship",
      description: "Check the compatibility between two users",
      options: [
        {
          name: "user",
          description: "The user to ship with yourself",
          type: ApplicationCommandOptionType.User,
          required: true,
        },
        {
          name: "user2",
          description: "A second user (defaults to you)",
          type: ApplicationCommandOptionType.User,
          required: false,
        },
      ],
      async execute(_client, interaction) {
        await interaction.defer();
        const left = interaction.options.getUser("user2") ?? interaction.user;
        const right = interaction.options.getUser("user", true);
        await cacheDiscordUsers(left, right);
        const score = randomCompatibilityScore();
        const card = await renderShipCard(left, right, score);
        const leftName = escapeMarkdown(left.globalName ?? left.username);
        const rightName = escapeMarkdown(right.globalName ?? right.username);

        await interaction.reply({
          files: [{ name: "ship.png", attachment: card }],
          ...v2(
            new Container()
              .media(Media("attachment://ship.png"))
              .text(
                Text(
                  `-# ${icons.heart} · **${leftName}** × **${rightName}**\nTheir compatibility is **${score}%**.`,
                ),
              )
              .separator(Separator()),
          ),
          allowedMentions: { parse: [] },
        });
      },
    }),
    new Subcommand({
      name: "joke",
      description: "Get a random joke",
      cooldown: 3,
      async execute(_client, interaction) {
        await interaction.defer();
        try {
          const joke = await fetchJson<Joke>(
            "https://official-joke-api.appspot.com/random_joke",
          );
          if (!joke.setup || !joke.punchline) {
            throw new Error("Joke API returned an incomplete joke");
          }
          await interaction.reply(
            textResponse(
              icons.question,
              "Random joke",
              `${joke.setup}\n\n||${joke.punchline}||`,
            ),
          );
        } catch {
          await interaction.reply(failureResponse("joke"));
        }
      },
    }),
    new Subcommand({
      name: "meme",
      description: "Get a random meme",
      cooldown: 3,
      async execute(_client, interaction) {
        await interaction.defer();
        try {
          const meme = await getSafeMeme();
          await interaction.reply(
            imageResponse(
              icons.reddit,
              meme.title ?? "Random meme",
              meme.url!,
              {
                label: "View original",
                url: meme.postLink ?? meme.url!,
              },
            ),
          );
        } catch {
          await interaction.reply(failureResponse("meme"));
        }
      },
    }),
    new Subcommand({
      name: "dog",
      description: "Get a random dog",
      cooldown: 3,
      async execute(_client, interaction) {
        await interaction.defer();
        try {
          const image = await fetchJson<DogImage>(
            "https://dog.ceo/api/breeds/image/random",
          );
          if (image.status !== "success" || !image.message) {
            throw new Error("Dog API returned no image");
          }
          await interaction.reply(
            imageResponse(icons.heart, "Random dog", image.message),
          );
        } catch {
          await interaction.reply(failureResponse("dog"));
        }
      },
    }),
    new Subcommand({
      name: "fact",
      description: "Get a random fact",
      cooldown: 3,
      async execute(_client, interaction) {
        await interaction.defer();
        try {
          const fact = await fetchJson<Fact>(
            "https://uselessfacts.jsph.pl/api/v2/facts/random?language=en",
          );
          if (!fact.text) throw new Error("Facts API returned no fact");
          await interaction.reply(
            textResponse(icons.bulb, "Random fact", fact.text),
          );
        } catch {
          await interaction.reply(failureResponse("fact"));
        }
      },
    }),
    new Subcommand({
      name: "cat",
      description: "Get a random cat",
      cooldown: 3,
      async execute(_client, interaction) {
        await interaction.defer();
        try {
          const images = await fetchJson<CatImage[]>(
            "https://api.thecatapi.com/v1/images/search?limit=1&order=RAND",
          );
          const imageUrl = images[0]?.url;
          if (!imageUrl) throw new Error("The Cat API returned no image");
          await interaction.reply(
            imageResponse(icons.image, "Random cat", imageUrl),
          );
        } catch {
          await interaction.reply(failureResponse("cat"));
        }
      },
    }),
  ],
});
