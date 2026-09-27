import {
  GuildPremiumTier,
  GuildVerificationLevel,
  time,
  TimestampStyles,
  type Guild,
  type GuildMember,
  type PartialGuildMember,
  type TimestampStylesString,
  type User,
} from "discord.js";

export function replaceVariables(
  content: string,
  options: {
    user: User;
    guild: Guild | null;
    member?: GuildMember | PartialGuildMember | null;
  },
): string {
  const { user, guild } = options;

  const member = options.member ?? guild?.members?.cache?.get(user.id) ?? null;

  const tag =
    user.discriminator && user.discriminator !== "0"
      ? `${user.username}#${user.discriminator}`
      : user.username;

  const variables: Record<string, string> = {
    // User
    "{user}": user.toString(),
    "{user.mention}": user.toString(),
    "{user.id}": user.id,
    "{user.username}": user.username,
    "{user.displayname}": user.displayName,
    "{user.tag}": tag,
    "{user.avatar}": user.displayAvatarURL({ size: 1024 }),
    "{user.createdat}": dynamicTimestamp(user.createdAt),
    "{user.createdtimestamp}": unixSeconds(user.createdAt).toString(),
    "{user.bot}": user.bot ? "Yes" : "No",

    // Member
    "{member.nickname}": member?.nickname ?? user.displayName,
    "{member.displayname}": member?.displayName ?? user.displayName,
    "{member.mention}": member?.toString() ?? user.toString(),
    "{member.joinedat}": member?.joinedAt
      ? dynamicTimestamp(member.joinedAt)
      : "",
    "{member.jointimestamp}": member?.joinedTimestamp
      ? unixSecondsFromMs(member.joinedTimestamp).toString()
      : "",
    "{member.color}": member?.displayHexColor ?? "",
    "{member.highestrole}": member?.roles.highest.name ?? "",
    "{member.boosting}": member?.premiumSince ? "Yes" : "No",

    // Guild
    "{guild.name}": guild?.name ?? "DM",
    "{server}": guild?.name ?? "DM",
    "{guild.id}": guild?.id ?? "",
    "{guild.icon}": guild?.iconURL({ size: 1024 }) ?? "",
    "{guild.banner}": guild?.bannerURL({ size: 1024 }) ?? "",
    "{guild.splash}": guild?.splashURL({ size: 1024 }) ?? "",
    "{guild.description}": guild?.description ?? "",
    "{guild.membercount}": guild?.memberCount?.toString() ?? "0",

    // Kept for backwards compatibility
    "{memberCount}": guild?.memberCount?.toString() ?? "0",

    "{guild.boostcount}": guild?.premiumSubscriptionCount?.toString() ?? "0",

    "{guild.boosttier}": formatBoostTier(guild?.premiumTier),

    "{guild.ownerid}": guild?.ownerId ?? "",

    "{guild.createdat}": guild ? dynamicTimestamp(guild.createdAt) : "",

    "{guild.createdtimestamp}": guild
      ? unixSeconds(guild.createdAt).toString()
      : "",

    "{guild.vanityurlcode}": guild?.vanityURLCode ?? "",

    "{guild.verificationlevel}": formatVerificationLevel(
      guild?.verificationLevel,
    ),

    // Date / time
    "{date}": dynamicTimestamp(new Date(), TimestampStyles.ShortDate),

    "{time}": dynamicTimestamp(new Date(), TimestampStyles.ShortTime),
  };

  let result = content;

  for (const [key, value] of Object.entries(variables)) {
    if (key.length === 0) continue;

    result = result.replaceAll(key, value);
  }
  result = result.replaceAll("\\n", "\n");
  return result;
}

function unixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function unixSecondsFromMs(ms: number): number {
  return Math.floor(ms / 1000);
}

function dynamicTimestamp(
  date: Date,
  style: TimestampStylesString = TimestampStyles.LongDateTime,
): string {
  return time(date, style);
}

function formatBoostTier(tier: GuildPremiumTier | undefined): string {
  switch (tier) {
    case GuildPremiumTier.Tier1:
      return "Tier 1";

    case GuildPremiumTier.Tier2:
      return "Tier 2";

    case GuildPremiumTier.Tier3:
      return "Tier 3";

    default:
      return "None";
  }
}

function formatVerificationLevel(
  level: GuildVerificationLevel | undefined,
): string {
  switch (level) {
    case GuildVerificationLevel.None:
      return "None";

    case GuildVerificationLevel.Low:
      return "Low";

    case GuildVerificationLevel.Medium:
      return "Medium";

    case GuildVerificationLevel.High:
      return "High";

    case GuildVerificationLevel.VeryHigh:
      return "Highest";

    default:
      return "";
  }
}
