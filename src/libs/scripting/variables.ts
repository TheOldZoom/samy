import {
  GuildPremiumTier,
  GuildVerificationLevel,
  type APIGuild,
  type APIGuildMember,
  type APIInteractionGuildMember,
  type APIRole,
  type User,
} from "discord.js";
import { CDN, type ChatInputCommandInteraction } from "discord.js";
import type { Interaction } from "@/classes/Interaction";

import type Client from "@/classes/Client";

const cdn = new CDN();

const DISCORD_EPOCH = 1420070400000n;

export type VariableMember = Pick<
  APIGuildMember,
  "nick" | "roles" | "joined_at" | "premium_since"
>;

export interface VariableSource {
  user: User;
  guild?: APIGuild | null;
  member?: VariableMember | null;
}

export function needsGuildData(content: string): boolean {
  return (
    content.includes("{guild") ||
    content.includes("{server}") ||
    content.includes("{memberCount}") ||
    content.includes("{member.color}") ||
    content.includes("{member.highestrole}")
  );
}

export async function getVariableSource(
  client: Client,
  interaction: Interaction<ChatInputCommandInteraction>,
  content: string,
): Promise<VariableSource> {
  const user = interaction.user;
  const member = normalizeMember(interaction.member);

  const guild =
    interaction.guild && needsGuildData(content)
      ? ({
          id: interaction.guild.id,
          name: interaction.guild.name,
          icon: interaction.guild.icon,
          banner: interaction.guild.banner,
          splash: interaction.guild.splash,
          description: interaction.guild.description,
          approximate_member_count: interaction.guild.memberCount,
          premium_subscription_count:
            interaction.guild.premiumSubscriptionCount ?? undefined,
          premium_tier: interaction.guild.premiumTier,
          owner_id: interaction.guild.ownerId,
          vanity_url_code: interaction.guild.vanityURLCode,
          verification_level: interaction.guild.verificationLevel,
          roles: interaction.guild.roles.cache.map((role) => ({
            id: role.id,
            name: role.name,
            color: role.color,
            position: role.position,
          })),
        } as APIGuild)
      : null;

  return { user, member, guild };
}

function normalizeMember(
  member: ChatInputCommandInteraction["member"],
): VariableMember | null {
  if (!member) {
    return null;
  }

  if ("roles" in member && Array.isArray(member.roles)) {
    const apiMember = member as APIInteractionGuildMember;

    return {
      nick: apiMember.nick ?? null,
      roles: apiMember.roles,
      joined_at: apiMember.joined_at,
      premium_since: apiMember.premium_since ?? null,
    };
  }

  if ("roles" in member && "cache" in member.roles) {
    const guildMember = member as {
      nickname: string | null;
      roles: { cache: Map<string, unknown> };
      joinedAt: Date | null;
      premiumSince: Date | null;
    };

    return {
      nick: guildMember.nickname,
      roles: [...guildMember.roles.cache.keys()],
      joined_at: guildMember.joinedAt?.toISOString() ?? null,
      premium_since: guildMember.premiumSince?.toISOString() ?? null,
    };
  }

  return null;
}

export function replaceVariables(
  content: string,
  { user, guild = null, member = null }: VariableSource,
): string {
  const displayName = user.globalName ?? user.username;
  const memberName = member?.nick ?? displayName;

  const tag =
    user.discriminator && user.discriminator !== "0"
      ? `${user.username}#${user.discriminator}`
      : user.username;

  const userCreatedAt = snowflakeToDate(user.id);
  const joinedAt = member?.joined_at ? new Date(member.joined_at) : null;
  const mention = `<@${user.id}>`;

  const guildCreatedAt = guild ? snowflakeToDate(guild.id) : null;
  const memberCount = guild?.approximate_member_count?.toString() ?? "0";

  const variables: Record<string, string> = {
    "{user}": mention,
    "{user.mention}": mention,
    "{user.id}": user.id,
    "{user.username}": user.username,
    "{user.displayname}": displayName,
    "{user.tag}": tag,
    "{user.avatar}": user.displayAvatarURL({
      size: 1024,
      extension: "png",
      forceStatic: false,
    }),
    "{user.createdat}": dynamicTimestamp(userCreatedAt),
    "{user.createdtimestamp}": unixSeconds(userCreatedAt).toString(),
    "{user.bot}": user.bot ? "Yes" : "No",

    "{member.nickname}": memberName,
    "{member.displayname}": memberName,
    "{member.mention}": mention,
    "{member.joinedat}": joinedAt ? dynamicTimestamp(joinedAt) : "",
    "{member.jointimestamp}": joinedAt ? unixSeconds(joinedAt).toString() : "",
    "{member.color}": member && guild ? memberColor(member, guild) : "",
    "{member.highestrole}":
      member && guild ? (highestRole(member, guild)?.name ?? "") : "",
    "{member.boosting}": member?.premium_since ? "Yes" : "No",

    "{guild.name}": guild?.name ?? "DM",
    "{server}": guild?.name ?? "DM",
    "{guild.id}": guild?.id ?? "",
    "{guild.icon}": guild?.icon
      ? cdn.icon(guild.id, guild.icon, { size: 1024 })
      : "",
    "{guild.banner}": guild?.banner
      ? cdn.banner(guild.id, guild.banner, { size: 1024 })
      : "",
    "{guild.splash}": guild?.splash
      ? cdn.splash(guild.id, guild.splash, { size: 1024 })
      : "",
    "{guild.description}": guild?.description ?? "",
    "{guild.membercount}": memberCount,

    "{memberCount}": memberCount,

    "{guild.boostcount}": (guild?.premium_subscription_count ?? 0).toString(),
    "{guild.boosttier}": formatBoostTier(guild?.premium_tier),
    "{guild.ownerid}": guild?.owner_id ?? "",
    "{guild.createdat}": guildCreatedAt ? dynamicTimestamp(guildCreatedAt) : "",
    "{guild.createdtimestamp}": guildCreatedAt
      ? unixSeconds(guildCreatedAt).toString()
      : "",
    "{guild.vanityurlcode}": guild?.vanity_url_code ?? "",
    "{guild.verificationlevel}": formatVerificationLevel(
      guild?.verification_level,
    ),

    "{date}": dynamicTimestamp(new Date(), "d"),
    "{time}": dynamicTimestamp(new Date(), "t"),
  };

  let result = content;

  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(key, value);
  }

  return result.replaceAll("\\n", "\n");
}

function snowflakeToDate(id: string): Date {
  return new Date(Number((BigInt(id) >> 22n) + DISCORD_EPOCH));
}

function unixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function dynamicTimestamp(date: Date, style: "F" | "d" | "t" = "F"): string {
  return `<t:${unixSeconds(date)}:${style}>`;
}

function memberRoles(member: VariableMember, guild: APIGuild): APIRole[] {
  return guild.roles
    .filter((role) => role.id === guild.id || member.roles.includes(role.id))
    .sort((a, b) => {
      if (a.position !== b.position) return b.position - a.position;

      return BigInt(a.id) < BigInt(b.id) ? -1 : 1;
    });
}

function highestRole(
  member: VariableMember,
  guild: APIGuild,
): APIRole | undefined {
  return memberRoles(member, guild)[0];
}

function memberColor(member: VariableMember, guild: APIGuild): string {
  const role = memberRoles(member, guild).find((role) => role.color !== 0);

  return `#${(role?.color ?? 0).toString(16).padStart(6, "0")}`;
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
