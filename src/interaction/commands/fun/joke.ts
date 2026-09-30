import Command from "@/classes/Command";
import { icons } from "@/utils/icons";
import {
  failureResponse,
  fetchJson,
  textResponse,
} from "@/utils/randomContent";

type Joke = {
  setup?: string;
  punchline?: string;
};

export default new Command({
  name: "joke",
  description: "Get a random joke",
  everywhere: true,
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
});
