import {
  ChannelType,
  type Channel,
  type Guild,
  type GuildBasedChannel,
  type GuildMember,
  type Role,
  type User,
} from "discord.js";

import type {
  ArgumentResolveResult,
  ArgumentResolverContext,
  ArgumentTypeDefinition,
  ArgumentTypeName,
} from "../../types/ArgumentType";

const USER_MENTION = /^<@!?(\d{15,20})>$/;
const ROLE_MENTION = /^<@&(\d{15,20})>$/;
const CHANNEL_MENTION = /^<#(\d{15,20})>$/;
const SNOWFLAKE = /^\d{15,20}$/;

function ok<T>(value: T): ArgumentResolveResult<T> {
  return {
    success: true,
    value,
  };
}

function fail<T = never>(error: string): ArgumentResolveResult<T> {
  return {
    success: false,
    error,
  };
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previousRow: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);

  let currentRow: number[] = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    currentRow[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      currentRow[j] = Math.min(
        currentRow[j - 1]! + 1,
        previousRow[j]! + 1,
        previousRow[j - 1]! + cost,
      );
    }

    [previousRow, currentRow] = [currentRow, previousRow];
  }

  return previousRow[b.length]!;
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1;

  const maxLen = Math.max(na.length, nb.length);

  if (maxLen === 0) return 1;

  const distance = levenshtein(na, nb);

  return Math.max(0, 1 - distance / maxLen);
}

function scoreCandidate(query: string, candidate: string): number {
  const nq = normalize(query);
  const nc = normalize(candidate);

  if (nq.length === 0 || nc.length === 0) {
    return 0;
  }

  if (nq === nc) {
    return 1;
  }

  if (nc.startsWith(nq)) {
    return 0.85 + (nq.length / nc.length) * 0.1;
  }

  if (nc.includes(nq)) {
    return 0.65 + (nq.length / nc.length) * 0.1;
  }

  return similarity(nq, nc) * 0.6;
}

interface MatchCandidate<T> {
  readonly item: T;
  readonly keys: readonly string[];
}

interface BestMatchOptions {
  readonly threshold?: number;
}

type BestMatchResult<T> =
  | {
      readonly status: "found";
      readonly item: T;
      readonly score: number;
    }
  | {
      readonly status: "none";
    };

function bestMatch<T>(
  query: string,
  candidates: readonly MatchCandidate<T>[],
  options: BestMatchOptions = {},
): BestMatchResult<T> {
  const threshold = options.threshold ?? 0.45;

  let bestItem: T | undefined;
  let bestScore = 0;

  for (const candidate of candidates) {
    let best = 0;

    for (const key of candidate.keys) {
      if (!key) continue;

      const score = scoreCandidate(query, key);

      if (score > best) {
        best = score;
      }
    }

    if (best >= threshold && best > bestScore) {
      bestScore = best;
      bestItem = candidate.item;
    }
  }

  if (bestItem === undefined) {
    return {
      status: "none",
    };
  }

  return {
    status: "found",
    item: bestItem,
    score: bestScore,
  };
}

function userSearchKeys(user: User, member?: GuildMember): string[] {
  const keys = [
    user.username,
    user.globalName,
    member?.displayName,
    member?.nickname,
  ];

  return keys.filter((key): key is string => Boolean(key));
}

function memberSearchKeys(member: GuildMember): string[] {
  return userSearchKeys(member.user, member);
}

class ArgumentRegistryClass {
  private readonly types = new Map<string, ArgumentTypeDefinition<unknown>>();

  register<T>(definition: ArgumentTypeDefinition<T>): void {
    this.types.set(
      definition.name.toLowerCase(),
      definition as ArgumentTypeDefinition<unknown>,
    );
  }

  get(name: ArgumentTypeName): ArgumentTypeDefinition<unknown> | undefined {
    return this.types.get(name.toLowerCase());
  }

  has(name: ArgumentTypeName): boolean {
    return this.types.has(name.toLowerCase());
  }
}

export const ArgumentRegistry = new ArgumentRegistryClass();

export function registerArgumentType<T>(
  definition: ArgumentTypeDefinition<T>,
): void {
  ArgumentRegistry.register(definition);
}

ArgumentRegistry.register<string>({
  name: "string",
  description: "Any text value.",

  resolve: (raw) => ok(raw),
});

ArgumentRegistry.register<number>({
  name: "number",
  description: "Any numeric value, including decimals.",

  resolve: (raw) => {
    const value = Number(raw);

    return Number.isNaN(value)
      ? fail(`"${raw}" is not a valid number`)
      : ok(value);
  },
});

ArgumentRegistry.register<number>({
  name: "integer",
  description: "A whole number.",

  resolve: (raw) => {
    const value = Number(raw);

    if (Number.isNaN(value) || !Number.isInteger(value)) {
      return fail(`"${raw}" is not a valid integer`);
    }

    return ok(value);
  },
});

ArgumentRegistry.register<boolean>({
  name: "boolean",
  description: "true or false.",

  resolve: (raw) => {
    const normalized = raw.toLowerCase();

    if (normalized === "true") {
      return ok(true);
    }

    if (normalized === "false") {
      return ok(false);
    }

    return fail(`"${raw}" is not a valid boolean (expected true or false)`);
  },
});

ArgumentRegistry.register<User>({
  name: "user",
  description: "A Discord user (mention, ID, or fuzzy name match).",

  resolve: async (raw, context): Promise<ArgumentResolveResult<User>> => {
    const { client, message } = context;

    const mentionMatch = raw.match(USER_MENTION);

    if (mentionMatch) {
      const id = mentionMatch[1];

      if (!id) {
        return fail(`Malformed mention "${raw}"`);
      }

      const cached = client.users.cache.get(id);

      if (cached) {
        return ok(cached);
      }

      try {
        return ok(await client.users.fetch(id));
      } catch {
        return fail(`No user found with ID "${id}"`);
      }
    }

    if (SNOWFLAKE.test(raw)) {
      const cached = client.users.cache.get(raw);

      if (cached) {
        return ok(cached);
      }

      try {
        return ok(await client.users.fetch(raw));
      } catch {
        return fail(`No user found with ID "${raw}"`);
      }
    }

    const channel = message.channel;

    if (channel.isTextBased()) {
      const candidateMap = new Map<string, MatchCandidate<User>>();

      for (const recent of channel.messages.cache.values()) {
        const author = recent.author;

        if (candidateMap.has(author.id)) {
          continue;
        }

        const member = message.guild?.members.cache.get(author.id);

        candidateMap.set(author.id, {
          item: author,
          keys: userSearchKeys(author, member),
        });
      }

      const result = bestMatch(raw, [...candidateMap.values()]);

      if (result.status === "found") {
        return ok(result.item);
      }
    }

    if (message.guild) {
      const guild = message.guild;

      let candidates: MatchCandidate<User>[] = guild.members.cache.map(
        (member) => ({
          item: member.user,
          keys: userSearchKeys(member.user, member),
        }),
      );

      let result = bestMatch(raw, candidates);

      if (result.status === "none") {
        const fetched = await guild.members.fetch().catch(() => null);

        if (fetched) {
          candidates = fetched.map((member) => ({
            item: member.user,
            keys: userSearchKeys(member.user, member),
          }));

          result = bestMatch(raw, candidates);
        }
      }

      if (result.status === "found") {
        return ok(result.item);
      }
    }

    const cacheCandidates: MatchCandidate<User>[] = client.users.cache.map(
      (user) => ({
        item: user,
        keys: userSearchKeys(user),
      }),
    );

    const cacheResult = bestMatch(raw, cacheCandidates);

    if (cacheResult.status === "found") {
      return ok(cacheResult.item);
    }

    return fail(`No user found matching "${raw}"`);
  },
});

ArgumentRegistry.register<GuildMember>({
  name: "member",
  description: "A guild member (mention, ID, or fuzzy name match).",

  resolve: async (
    raw,
    context,
  ): Promise<ArgumentResolveResult<GuildMember>> => {
    const { message } = context;

    if (!message.guild) {
      return fail("This argument can only be used in a server");
    }

    const mentionMatch = raw.match(USER_MENTION);

    if (mentionMatch) {
      const id = mentionMatch[1];

      if (!id) {
        return fail(`Malformed mention "${raw}"`);
      }

      const cached = message.guild.members.cache.get(id);

      if (cached) {
        return ok(cached);
      }

      try {
        return ok(await message.guild.members.fetch(id));
      } catch {
        return fail(`No member found with ID "${id}"`);
      }
    }

    if (SNOWFLAKE.test(raw)) {
      const cached = message.guild.members.cache.get(raw);

      if (cached) {
        return ok(cached);
      }

      try {
        return ok(await message.guild.members.fetch(raw));
      } catch {
        return fail(`No member found with ID "${raw}"`);
      }
    }

    let candidates: MatchCandidate<GuildMember>[] =
      message.guild.members.cache.map((member) => ({
        item: member,
        keys: memberSearchKeys(member),
      }));

    let result = bestMatch(raw, candidates);

    if (result.status === "none") {
      const fetched = await message.guild.members.fetch().catch(() => null);

      if (fetched) {
        candidates = fetched.map((member) => ({
          item: member,
          keys: memberSearchKeys(member),
        }));

        result = bestMatch(raw, candidates);
      }
    }

    if (result.status === "found") {
      return ok(result.item);
    }

    return fail(`No member found matching "${raw}"`);
  },
});

ArgumentRegistry.register<Role>({
  name: "role",
  description: "A guild role (mention, ID, or fuzzy name match).",

  resolve: async (raw, context): Promise<ArgumentResolveResult<Role>> => {
    const { message } = context;

    if (!message.guild) {
      return fail("This argument can only be used in a server");
    }

    const mentionMatch = raw.match(ROLE_MENTION);

    if (mentionMatch) {
      const id = mentionMatch[1];

      if (!id) {
        return fail(`Malformed mention "${raw}"`);
      }

      const cached = message.guild.roles.cache.get(id);

      if (cached) {
        return ok(cached);
      }

      const role = await message.guild.roles.fetch(id).catch(() => null);

      return role ? ok(role) : fail(`No role found with ID "${id}"`);
    }

    if (SNOWFLAKE.test(raw)) {
      const cached = message.guild.roles.cache.get(raw);

      if (cached) {
        return ok(cached);
      }

      const role = await message.guild.roles.fetch(raw).catch(() => null);

      return role ? ok(role) : fail(`No role found with ID "${raw}"`);
    }

    const candidates: MatchCandidate<Role>[] = message.guild.roles.cache.map(
      (role) => ({
        item: role,
        keys: [role.name],
      }),
    );

    const result = bestMatch(raw, candidates);

    if (result.status === "found") {
      return ok(result.item);
    }

    return fail(`No role found matching "${raw}"`);
  },
});

ArgumentRegistry.register<Channel>({
  name: "channel",
  description: "A guild channel (mention, ID, or fuzzy name match).",

  resolve: async (raw, context): Promise<ArgumentResolveResult<Channel>> => {
    const { message } = context;

    if (!message.guild) {
      return fail("This argument can only be used in a server");
    }

    const mentionMatch = raw.match(CHANNEL_MENTION);

    if (mentionMatch) {
      const id = mentionMatch[1];

      if (!id) {
        return fail(`Malformed mention "${raw}"`);
      }

      const cached = message.guild.channels.cache.get(id);

      if (cached) {
        return ok(cached);
      }

      const channel = await message.guild.channels.fetch(id).catch(() => null);

      return channel ? ok(channel) : fail(`No channel found with ID "${id}"`);
    }

    if (SNOWFLAKE.test(raw)) {
      const cached = message.guild.channels.cache.get(raw);

      if (cached) {
        return ok(cached);
      }

      const channel = await message.guild.channels.fetch(raw).catch(() => null);

      return channel ? ok(channel) : fail(`No channel found with ID "${raw}"`);
    }

    const candidates: MatchCandidate<Channel>[] = [];

    for (const channel of message.guild.channels.cache.values()) {
      if (!channel?.name) {
        continue;
      }

      candidates.push({
        item: channel,
        keys: [channel.name],
      });
    }

    const result = bestMatch(raw, candidates);

    if (result.status === "found") {
      return ok(result.item);
    }

    return fail(`No channel found matching "${raw}"`);
  },
});

export const CHANNEL_LIKE_TYPES = new Set<ChannelType>([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,

  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,

  ChannelType.GuildForum,
  ChannelType.GuildMedia,

  ChannelType.GuildVoice,
  ChannelType.GuildStageVoice,
]);

export type ChannelLikeMatch =
  | { status: "found"; channel: GuildBasedChannel }
  | { status: "not_found" }
  | { status: "wrong_type"; channel: GuildBasedChannel };

export async function findChannelLike(
  guild: Guild,
  raw: string,
  allowedTypes: ReadonlySet<ChannelType>,
): Promise<ChannelLikeMatch> {
  const mentionMatch = raw.match(CHANNEL_MENTION);

  if (mentionMatch) {
    const id = mentionMatch[1];

    if (!id) {
      return { status: "not_found" };
    }

    const channel =
      guild.channels.cache.get(id) ??
      (await guild.channels.fetch(id).catch(() => null));

    if (!channel) {
      return { status: "not_found" };
    }

    return allowedTypes.has(channel.type)
      ? { status: "found", channel }
      : { status: "wrong_type", channel };
  }

  if (SNOWFLAKE.test(raw)) {
    const channel =
      guild.channels.cache.get(raw) ??
      (await guild.channels.fetch(raw).catch(() => null));

    if (!channel) {
      return { status: "not_found" };
    }

    return allowedTypes.has(channel.type)
      ? { status: "found", channel }
      : { status: "wrong_type", channel };
  }

  const candidates: MatchCandidate<GuildBasedChannel>[] = [];

  for (const channel of guild.channels.cache.values()) {
    if (!channel.name) {
      continue;
    }

    if (!allowedTypes.has(channel.type)) {
      continue;
    }

    candidates.push({
      item: channel,
      keys: [channel.name],
    });
  }

  const result = bestMatch(raw, candidates);

  if (result.status === "found") {
    return { status: "found", channel: result.item };
  }

  return { status: "not_found" };
}

ArgumentRegistry.register<GuildBasedChannel>({
  name: "channelLike",
  description:
    "A guild channel, thread, forum, or media channel (mention, ID, or fuzzy name match).",

  resolve: async (
    raw,
    context,
  ): Promise<ArgumentResolveResult<GuildBasedChannel>> => {
    const { message } = context;

    if (!message.guild) {
      return fail("This argument can only be used in a server");
    }

    const match = await findChannelLike(message.guild, raw, CHANNEL_LIKE_TYPES);

    if (match.status === "found") {
      return ok(match.channel);
    }

    return fail(`No channel, thread, or forum found matching "${raw}"`);
  },
});

ArgumentRegistry.register<User[]>({
  name: "userList",
  description: "A list of Discord users (mentions or IDs, separated by spaces).",

  resolve: async (raw, context): Promise<ArgumentResolveResult<User[]>> => {
    const { message } = context;

    if (!message.guild) {
      return fail("This argument can only be used in a server");
    }

    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return fail("No users provided");
    }

    const users: User[] = [];
    const errors: string[] = [];

    for (const part of parts) {
      const userArg = ArgumentRegistry.get("user");
      if (!userArg) {
        errors.push("User resolver not found");
        continue;
      }

      const result = await userArg.resolve(part, context);
      if (result.success) {
        users.push(result.value as User);
      } else {
        errors.push(`"${part}": ${result.error}`);
      }
    }

    if (users.length === 0) {
      return fail(`No valid users found. Errors: ${errors.join(", ")}`);
    }

    return ok(users);
  },
});

ArgumentRegistry.register<GuildMember[]>({
  name: "memberList",
  description: "A list of guild members (mentions or IDs, separated by spaces).",

  resolve: async (
    raw,
    context,
  ): Promise<ArgumentResolveResult<GuildMember[]>> => {
    const { message } = context;

    if (!message.guild) {
      return fail("This argument can only be used in a server");
    }

    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return fail("No members provided");
    }

    const members: GuildMember[] = [];
    const errors: string[] = [];

    for (const part of parts) {
      const memberArg = ArgumentRegistry.get("member");
      if (!memberArg) {
        errors.push("Member resolver not found");
        continue;
      }

      const result = await memberArg.resolve(part, context);
      if (result.success) {
        members.push(result.value as GuildMember);
      } else {
        errors.push(`"${part}": ${result.error}`);
      }
    }

    if (members.length === 0) {
      return fail(`No valid members found. Errors: ${errors.join(", ")}`);
    }

    return ok(members);
  },
});
