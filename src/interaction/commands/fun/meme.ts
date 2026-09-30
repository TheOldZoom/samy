import Command from "@/classes/Command";
import { icons } from "@/utils/icons";
import {
  failureResponse,
  fetchJson,
  imageResponse,
} from "@/utils/randomContent";

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
  name: "meme",
  description: "Get a random meme",
  everywhere: true,
  cooldown: 3,

  async execute(_client, interaction) {
    await interaction.defer();

    try {
      const meme = await getSafeMeme();

      await interaction.reply(
        imageResponse(icons.reddit, meme.title ?? "Random meme", meme.url!, {
          label: "View original",
          url: meme.postLink ?? meme.url!,
        }),
      );
    } catch {
      await interaction.reply(failureResponse("meme"));
    }
  },
});
