import Command from "@/classes/Command";
import { formatDuration, formatMs, toMB } from "@/utils/format";
import { icons } from "@/utils/icons";
import {
  ActionRow,
  Buttons,
  Container,
  Separator,
  Text,
  v2,
} from "@/utils/ui/components";

export default new Command({
  name: "debug",
  description: "Replies with the bot's stats",
  everywhere: true,
  ephemeral: true,
  async execute(client, interaction) {
    const [{ ws, rest, db }, application] = await Promise.all([
      client.ping(interaction.guild_id, "ws", "rest", "db"),
      client.api.applications.getCurrent(),
    ]);

    const startedAt = Math.floor(Date.now() / 1000 - process.uptime());

    await interaction.reply(
      v2(
        new Container()
          .text(
            Text(`-# ${icons.snowflake} Bot stats`),
            Text(
              `> Gateway: **${formatMs(ws)}**
> REST: **${rest}ms**
> Database: **${formatMs(db, "Unreachable")}**
> Uptime: **${formatDuration(process.uptime())} (<t:${startedAt}:f>)**
> Servers: **${application.approximate_guild_count ?? "N/A"}**
> User Installs: **${application.approximate_user_install_count ?? "N/A"}**`,
            ),
          )
          .separator(Separator())
          .actionRow(
            ActionRow(
              Buttons.link(
                "Add App",
                `https://discord.com/oauth2/authorize?client_id=${client.user!.id}`,
                icons.invite,
              ),
              Buttons.link("Website", process.env.WEBSITE_URL!, icons.link),
              Buttons.link("Discord", process.env.DISCORD_URL!, icons.Discord),
            ),
          ),
      ),
    );
  },
});
