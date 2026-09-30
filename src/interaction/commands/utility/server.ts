import Command from "@/classes/Command";
import { renderServerCard } from "@/utils/ui/cards/server";
import { icons } from "@/utils/icons";
import {
  ActionRow,
  Buttons,
  Container,
  Media,
  Separator,
  Text,
  v2,
} from "@/utils/ui/components";

function createdAt(id: string) {
  return Math.floor(Number((BigInt(id) >> 22n) + 1420070400000n) / 1000);
}

function boostLevel(level: number) {
  return ["Tier 0", "Tier 1", "Tier 2", "Tier 3"][level] ?? "Unknown";
}

function verificationLevel(level: number) {
  return ["None", "Low", "Medium", "High", "Very High"][level] ?? "Unknown";
}

export default new Command({
  name: "server",
  description: "Shows information about this server",
  ephemeral: true,

  async execute(_client, interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        ...v2(
          new Container().text(Text("This command only works in a server.")),
        ),
        ephemeral: true,
      });
      return;
    }

    await interaction.defer();

    const guild = interaction.guild;
    const [owner, card] = await Promise.all([
      guild.fetchOwner().catch(() => null),
      renderServerCard(guild),
    ]);
    const timestamp = createdAt(guild.id);
    const filename = "server." + card.ext;
    const code = String.fromCharCode(96);
    const buttons = [
      ...(guild.icon
        ? [Buttons.secondary("Icon", "server:icon:" + guild.id, icons.image)]
        : []),
      ...(guild.banner
        ? [
            Buttons.secondary(
              "Banner",
              "server:banner:" + guild.id,
              icons.image,
            ),
          ]
        : []),
    ];
    const container = new Container()
      .media(Media("attachment://" + filename))
      .text(
        Text(
          [
            "-# " +
              icons.folder +
              " **" +
              guild.name +
              "** · " +
              guild.memberCount.toLocaleString() +
              " members",
            code + guild.id + code,
            guild.description ? "> " + guild.description : "",
            " ",
            "Created: **<t:" + timestamp + ":D> (<t:" + timestamp + ":R>)**",
            owner ? `Owner: **${owner.user.username} (${owner.user})**` : "",
            "Members: **" +
              guild.memberCount.toLocaleString() +
              "** · Channels: **" +
              guild.channels.cache.size.toLocaleString() +
              "**",
            "Roles: **" +
              Math.max(guild.roles.cache.size - 1, 0).toLocaleString() +
              "** · Emojis: **" +
              guild.emojis.cache.size.toLocaleString() +
              "** · Stickers: **" +
              guild.stickers.cache.size.toLocaleString() +
              "**",
            "Verification: **" +
              verificationLevel(guild.verificationLevel) +
              "**",
            "Boosts: **" +
              (guild.premiumSubscriptionCount ?? 0).toLocaleString() +
              " boosts · " +
              boostLevel(guild.premiumTier) +
              "**",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      );

    if (buttons.length) {
      container.separator(Separator()).actionRow(ActionRow(...buttons));
    }

    await interaction.reply({
      files: [{ name: filename, attachment: card.data }],
      ...v2(container),
      flags: 1 << 15,
      allowedMentions: { parse: [] },
    });
  },
});
