import Command from "@/classes/Command";
import { icons } from "@/utils/icons";
import {
  failureResponse,
  fetchJson,
  imageResponse,
} from "@/utils/randomContent";

type DogImage = {
  message?: string;
  status?: string;
};

export default new Command({
  name: "dog",
  description: "Get a random dog",
  everywhere: true,
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
});
