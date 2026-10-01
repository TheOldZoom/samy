import { ButtonStyle, escapeMarkdown } from "discord.js";
import { icons } from "@/utils/icons";
import { fetchJson } from "@/utils/randomContent";
import {
  ActionRow,
  Button,
  Container,
  Separator,
  Text,
} from "@/utils/ui/components";

export interface UrbanDefinition {
  definition: string;
  permalink: string;
  thumbs_up: number;
  thumbs_down: number;
  author: string;
  word: string;
  written_on: string;
  example: string;
}

const REQUEST_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_REQUEST_CACHE_ENTRIES = 200;

const requestCache = new Map<
  string,
  { definitions: UrbanDefinition[]; expiresAt: number }
>();
const pendingRequests = new Map<string, Promise<UrbanDefinition[]>>();

export async function searchUrban(query: string): Promise<UrbanDefinition[]> {
  const cacheKey = query.trim().toLowerCase();
  const cached = requestCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) return cached.definitions;
  if (cached) requestCache.delete(cacheKey);

  const pending = pendingRequests.get(cacheKey);
  if (pending) return pending;

  const url = new URL("https://api.urbandictionary.com/v0/define");
  url.searchParams.set("term", query);

  const request = fetchJson<{ list?: UrbanDefinition[] }>(url.href).then(
    (data) => {
      const definitions = data.list ?? [];
      requestCache.set(cacheKey, {
        definitions,
        expiresAt: Date.now() + REQUEST_CACHE_TTL_MS,
      });

      if (requestCache.size > MAX_REQUEST_CACHE_ENTRIES) {
        const oldest = requestCache.keys().next().value;
        if (oldest) requestCache.delete(oldest);
      }

      return definitions;
    },
  );

  pendingRequests.set(cacheKey, request);

  try {
    return await request;
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;

const searches = new Map<
  string,
  { definitions: UrbanDefinition[]; expiresAt: number }
>();

export function cacheUrbanSearch(definitions: UrbanDefinition[]): string {
  const token = crypto.randomUUID().replaceAll("-", "").slice(0, 10);

  searches.set(token, { definitions, expiresAt: Date.now() + CACHE_TTL_MS });

  if (searches.size > MAX_CACHE_ENTRIES) {
    const oldest = searches.keys().next().value;
    if (oldest) searches.delete(oldest);
  }

  return token;
}

export function getUrbanSearch(token: string): UrbanDefinition[] | null {
  const entry = searches.get(token);

  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    searches.delete(token);
    return null;
  }

  return entry.definitions;
}

const BRACKETED = /\[([^\]]+)\]/g;

function termUrl(word: string) {
  const term = encodeURIComponent(word)
    .replaceAll("(", "%28")
    .replaceAll(")", "%29");

  return `https://urbandictionary.com/define.php?term=${term}`;
}

function format(text: string, rawMax: number, linkedMax: number) {
  const raw = text.replace(/\r\n/g, "\n").trim();
  const cut = raw.length > rawMax ? `${raw.slice(0, rawMax - 1)}…` : raw;
  const linked = cut.replace(
    BRACKETED,
    (_, word: string) => `[${word}](${termUrl(word)})`,
  );

  return linked.length <= linkedMax ? linked : cut.replace(BRACKETED, "$1");
}

export function UrbanResult(def: UrbanDefinition) {
  const definition =
    format(def.definition, 1200, 2000) || "No definition provided.";
  const example = format(def.example, 700, 1200);
  const writtenOn = Date.parse(def.written_on);

  return new Container()
    .text(
      Text(`-# ${icons.book} **${escapeMarkdown(def.word.slice(0, 100))}**`),
    )
    .text(Text(definition))
    .separator(Separator())
    .text(
      Text(
        `-# ${icons.book} **Example:**\n${example || "No example provided."}`,
      ),
    )
    .separator(Separator())
    .text(
      Text(
        `-# **Author:** ${escapeMarkdown(def.author)} • **Votes:** ${icons.upvote} ${def.thumbs_up} ${icons.downvote} ${def.thumbs_down}${
          Number.isFinite(writtenOn)
            ? ` • **Defined on:** <t:${Math.floor(writtenOn / 1000)}:d>`
            : ""
        }`,
      ),
    );
}

export function buildUrbanView(
  definitions: UrbanDefinition[],
  page: number,
  token: string,
  userId: string,
) {
  const totalPages = definitions.length;
  const current = Math.min(Math.max(page, 0), totalPages - 1);
  const container = UrbanResult(definitions[current]!);

  if (totalPages > 1) {
    container.actionRow(
      ActionRow(
        Button({
          emoji: icons.leftarrow,
          label: " ",
          customId: `urban:page:${userId}.${current - 1}.${token}`,
          style: ButtonStyle.Secondary,
          disabled: current === 0,
        }),
        Button({
          label: `Page ${current + 1}/${totalPages}`,
          customId: `urban:noop:${token}`,
          style: ButtonStyle.Secondary,
          disabled: true,
        }),
        Button({
          emoji: icons.rightarrow,
          label: " ",
          customId: `urban:page:${userId}.${current + 1}.${token}`,
          style: ButtonStyle.Secondary,
          disabled: current >= totalPages - 1,
        }),
      ),
    );
  }

  return container;
}
