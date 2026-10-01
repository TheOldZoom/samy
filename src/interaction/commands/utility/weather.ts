import { ApplicationCommandOptionType, escapeMarkdown } from "discord.js";
import Command from "@/classes/Command";
import { icons } from "@/utils/icons";
import { failureResponse } from "@/utils/randomContent";
import { ActionRow, Buttons, Container, Text, v2 } from "@/utils/ui/components";
import { getWeather, searchLocations } from "@/utils/weather";

export default new Command({
  name: "weather",
  description: "Check the weather for a location",
  everywhere: true,
  ephemeral: true,
  cooldown: 5,
  options: [
    {
      name: "location",
      description: "A city or location, such as San José, Costa Rica",
      type: ApplicationCommandOptionType.String,
      required: true,
      max_length: 100,
      autocomplete: true,
    },
    {
      name: "unit",
      description: "Which measurement system to use",
      type: ApplicationCommandOptionType.String,
      choices: [
        { name: "Metric", value: "metric" },
        { name: "Imperial", value: "imperial" },
      ],
    },
  ],

  async autocomplete(_client, interaction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name !== "location") {
      await interaction.autocomplete({ choices: [] });
      return;
    }

    const choices = await searchLocations(String(focused.value));
    await interaction.autocomplete({ choices });
  },

  async execute(_client, interaction) {
    await interaction.defer();

    const location = interaction.getOptionValue(
      "location",
      ApplicationCommandOptionType.String,
    )!;
    const unit =
      (interaction.getOptionValue(
        "unit",
        ApplicationCommandOptionType.String,
      ) as "metric" | "imperial" | null) ?? "metric";

    try {
      const weather = await getWeather(location, unit);

      if (!weather) {
        await interaction.reply({
          ...v2(
            new Container().text(
              Text(
                `${icons.Wrong} · No location matched **${escapeMarkdown(location)}**.`,
              ),
            ),
          ),
          ephemeral: true,
          allowedMentions: { parse: [] },
        });
        return;
      }

      await interaction.reply({
        ...v2(
          new Container()
            .text(
              Text(
                `-# ${icons.globe} · Weather · **${escapeMarkdown(weather.location)}**`,
              ),
              Text(
                [
                  `**${weather.condition}** · ${weather.temperature} · feels like ${weather.feelsLike}`,
                  `High / low: **${weather.range}**`,
                  `Humidity: **${weather.humidity}** · Wind: **${weather.wind}**`,
                  `Precipitation: **${weather.precipitation}** · chance **${weather.precipitationChance}**`,
                  `Sunrise: **${weather.sunrise}** · Sunset: **${weather.sunset}**`,
                  `-# ${weather.timezone} · Updated ${weather.updatedAt}`,
                ].join("\n"),
              ),
            )
            .actionRow(
              ActionRow(
                Buttons.link(
                  "Open-Meteo",
                  "https://open-meteo.com/",
                  icons.link,
                ),
              ),
            ),
        ),
        allowedMentions: { parse: [] },
      });
    } catch {
      await interaction.reply(failureResponse("weather forecast"));
    }
  },
});
