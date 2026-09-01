import { GuildVerificationLevel, type Guild, ChannelType } from "discord.js";

import type Client from "@/classes/client";
import { Container, Media, Section, Separator } from "@/ui/components";

const VERIFICATION_LABELS: Record<GuildVerificationLevel, string> = {
  [GuildVerificationLevel.None]: "None",
  [GuildVerificationLevel.Low]: "Low",
  [GuildVerificationLevel.Medium]: "Medium",
  [GuildVerificationLevel.High]: "High",
  [GuildVerificationLevel.VeryHigh]: "Highest",
};

export async function ServerInfo(client: Client, guild: Guild) {
  const owner = await guild.fetchOwner().catch(() => null);
  const channels = guild.channels.cache;
  const roles = guild.roles.cache;

  const textChannels = channels.filter(
    (c) => c.isTextBased() && !c.isThread(),
  ).size;

  const voiceChannels = channels.filter((c) => c.isVoiceBased()).size;

  const categories = channels.filter((c) => c.type === ChannelType.GuildCategory).size;

  const humanCount = guild.members.cache.filter((m) => !m.user.bot).size;
  const botCount = guild.members.cache.filter((m) => m.user.bot).size;

  const iconURL = guild.iconURL({ size: 512 });
  const bannerURL = guild.bannerURL({ size: 1024 });

  const section = Section({
    title: client.i18n.t("commands.serverinfo.title", {
      name: guild.name,
    }),
    description: client.i18n.t("commands.serverinfo.details", {
      id: guild.id,
      owner: owner
        ? `<@${owner.id}>`
        : client.i18n.t("commands.serverinfo.unknown"),
      created: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`,
      members: guild.memberCount.toLocaleString(),
      humans: humanCount.toLocaleString(),
      bots: botCount.toLocaleString(),
      roles: roles.size.toLocaleString(),
      textChannels: textChannels.toLocaleString(),
      voiceChannels: voiceChannels.toLocaleString(),
      categories: categories.toLocaleString(),
      boostTier: guild.premiumTier,
      boostCount: (guild.premiumSubscriptionCount ?? 0).toLocaleString(),
      verification: VERIFICATION_LABELS[guild.verificationLevel],
      emojis: guild.emojis.cache.size.toLocaleString(),
    }),
    thumbnail: iconURL ?? undefined,
  });

  const container = new Container().section(section);

  if (bannerURL) {
    return [
      container,
      new Container().separator(Separator()).media(Media(bannerURL)),
    ];
  }

  return [container];
}
