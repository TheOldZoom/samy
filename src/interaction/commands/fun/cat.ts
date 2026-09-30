import Command from "@/classes/Command";
import { icons } from "@/utils/icons";
import {
  failureResponse,
  fetchJson,
  imageResponse,
} from "@/utils/randomContent";

type CatImage = {
  url?: string;
};

export default new Command({
  name: "cat",
  description: "Get a random cat",
  everywhere: true,
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
});
