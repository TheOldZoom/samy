import Command from "@/classes/Command";
import { icons } from "@/utils/icons";
import {
  failureResponse,
  fetchJson,
  textResponse,
} from "@/utils/randomContent";

type Fact = {
  text?: string;
};

export default new Command({
  name: "fact",
  description: "Get a random fact",
  everywhere: true,
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
});
