import { icons } from "@/utils/icons";
import {
  ActionRow,
  Buttons,
  Container,
  Media,
  Separator,
  Text,
} from "@/utils/ui/components";

const MAX_PARENTS = 3;
const MEDIA_GALLERY_LIMIT = 10;
const LINK_CACHE_TTL_MS = 5 * 60 * 1000;
const LINK_CACHE_LIMIT = 500;

const INSTAGRAM_HOST =
  process.env.INSTAGRAM_EMBED_HOST ?? "https://ig.mynameistito.com";

const DISCORD_UA =
  "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";

type LinkButton = { label: string; icon: string };

type Post = {
  url: string;
  header: string;
  text: string;
  extra?: string;
  note?: string;
  media: string[];
  stats: string[];
  timestamp?: number;
};

type KoutubeData = {
  contentType?: string | null;
  playerStreamUrl?: string | null;
  image?: string | null;
  description?: string | null;
  originalUrl?: string | null;
  authorName?: string | null;
  uploadDate?: string | null;
  likeCount?: string | number | null;
  dislikeCount?: string | number | null;
  subscriberCount?: string | number | null;
  viewCount?: string | number | null;
  videoCount?: string | number | null;
  songCount?: string | number | null;
  error?: string | null;
};

export type LinkHandler = {
  pattern: RegExp;
  run: (match: RegExpMatchArray) => Promise<Container[] | null>;
};

type CacheEntry = {
  expiresAt: number;
  value: Container[];
};

const linkCache = new Map<string, CacheEntry>();
const pendingLinks = new Map<string, Promise<Container[] | null>>();

function cacheLink(key: string, value: Container[]) {
  const now = Date.now();
  for (const [cachedKey, entry] of linkCache) {
    if (entry.expiresAt <= now) linkCache.delete(cachedKey);
  }

  while (linkCache.size >= LINK_CACHE_LIMIT) {
    const oldest = linkCache.keys().next().value;
    if (oldest === undefined) break;
    linkCache.delete(oldest);
  }

  linkCache.set(key, { expiresAt: now + LINK_CACHE_TTL_MS, value });
}

const compact = new Intl.NumberFormat("en", { notation: "compact" });

const decodeHtml = (s: string) =>
  s
    .replaceAll("&#x200B;", "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    );

const stat = (icon: string, n?: number | null) =>
  n != null ? [`${icon} ${compact.format(n)}`] : [];

async function fetchJson<T>(url: string, timeout = 8000): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function postContainer(
  p: Post,
  button: LinkButton,
  { total }: { total: number },
) {
  const limit = Math.min(1500, Math.floor(1600 / total));

  const body =
    (p.note ? `-# ${p.note}\n` : "") +
    `${p.header}\n${p.text.slice(0, limit)}` +
    (p.extra ? `\n\n${p.extra}` : "");

  const footer = [
    p.stats.join("  ·  "),
    p.timestamp ? `-# <t:${Math.floor(p.timestamp)}:R>` : "",
  ]
    .filter(Boolean)
    .join("\n");

  let container = new Container().text(Text(body));
  for (let i = 0; i < p.media.length; i += MEDIA_GALLERY_LIMIT) {
    container = container.media(
      Media(...p.media.slice(i, i + MEDIA_GALLERY_LIMIT)),
    );
  }
  container = container.separator(Separator());
  if (footer) container = container.text(Text(footer));

  return container.actionRow(
    ActionRow(Buttons.link(button.label, p.url, button.icon)),
  );
}

const single = (post: Post, button: LinkButton) => [
  postContainer(post, button, { total: 1 }),
];

function ogTags(html: string) {
  const tags: Record<string, string> = {};
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = tag.match(/(?:property|name)=(["'])(.*?)\1/i)?.[2];
    const value = tag.match(/content=(["'])(.*?)\1/is)?.[2];
    if (key && value !== undefined)
      tags[key.toLowerCase()] ??= decodeHtml(value);
  }
  return tags;
}

function koutubeUrls(url: string) {
  const original = new URL(url);
  const short = original.hostname.toLowerCase() === "youtu.be";
  const music = original.hostname.toLowerCase().startsWith("music.");
  const host = short ? "koutu.be" : music ? "music.koutube.com" : "koutube.com";
  const page = new URL(original);
  page.hostname = host;

  const api = new URL(page);
  api.pathname = `/api${page.pathname}`;
  return { api: api.toString(), page: page.toString() };
}

const koutubeStat = (icon: string, value?: string | number | null) =>
  value != null && value !== "" ? `${icon} ${value}` : null;

async function fetchKoutube(url: string): Promise<Post | null> {
  try {
    const urls = koutubeUrls(url);
    const [data, html] = await Promise.all([
      fetchJson<KoutubeData>(urls.api, 12_000),
      fetch(urls.page, {
        headers: { "User-Agent": DISCORD_UA },
        signal: AbortSignal.timeout(12_000),
      })
        .then((res) => (res.ok ? res.text() : ""))
        .catch(() => ""),
    ]);
    if (data?.error) return null;

    const tags = ogTags(html);
    const title = tags["twitter:title"] ?? tags["og:title"];
    const video = data?.playerStreamUrl ?? tags["og:video"];
    const image = data?.image ?? tags["twitter:image"] ?? tags["og:image"];
    if (!data && !title && !video && !image) return null;

    return {
      url: data?.originalUrl ?? url,
      header: `**${title ?? data?.authorName ?? "YouTube"}**`,
      text: [
        data?.authorName ? `**${data.authorName}**` : null,
        data?.description ? decodeHtml(data.description) : null,
      ]
        .filter(Boolean)
        .join("\n"),
      extra: [data?.contentType, data?.uploadDate].filter(Boolean).join(" · "),
      media: video ? [video] : image ? [image] : [],
      stats: [
        koutubeStat(icons.view, data?.viewCount),
        koutubeStat(icons.heart, data?.likeCount),
        koutubeStat(icons.dislike, data?.dislikeCount),
        koutubeStat(icons.people, data?.subscriberCount),
      ].filter((value): value is string => Boolean(value)),
    };
  } catch {
    return null;
  }
}

type Author = { name: string; screen_name: string };
type Reply = { screen_name: string; status: string };

type Status = {
  type: string;
  url: string;
  text: string;
  created_timestamp: number;
  likes: number;
  reposts: number;
  replies: number;
  views?: number | null;
  author: Author;
  replying_to?: Reply | null;
  quote?: Status;
  poll?: { choices: { label: string; percentage: number }[] };
  media?: {
    photos?: { url: string }[];
    videos?: {
      url: string;
      format?: string;
      thumbnail_url?: string | null;
    }[];
  };
};

type Step = { status: Status; via?: "quote" | "reply" };

const NOTES = {
  quote: `${icons.quotes} Quotes the post above`,
  reply: `${icons.reply} Replying to the post above`,
};

const isMp4 = (v: { url: string; format?: string }) =>
  v.format === "video/mp4" || /\.mp4(\?|$)/i.test(v.url);

async function fetchStatus(url: string): Promise<Status | null> {
  const data = await fetchJson<{ status?: Status }>(url);
  return data?.status?.type === "status" ? data.status : null;
}

const fetchX = (id: string) =>
  fetchStatus(`https://api.fxtwitter.com/2/status/${id}`);

const fetchBsky = (handle: string, rkey: string) =>
  fetchStatus(`https://api.fxbsky.app/2/status/${handle}/${rkey}`);

function toPost({ status: s, via }: Step): Post {
  return {
    url: s.url,
    header:
      s.author.name === s.author.screen_name
        ? `**@${s.author.screen_name}**`
        : `**${s.author.name}** (@${s.author.screen_name})`,
    text: s.text,
    extra: s.poll?.choices
      .map((c) => `${icons.hyphen} ${c.label}: ${c.percentage}%`)
      .join("\n"),
    note: via ? NOTES[via] : undefined,
    media: [
      ...(s.media?.photos ?? []).map((p) => p.url),
      ...(s.media?.videos ?? []).map((v) =>
        isMp4(v) ? v.url : v.thumbnail_url,
      ),
    ].filter((url): url is string => Boolean(url)),
    stats: [
      `${icons.reply} ${compact.format(s.replies)}`,
      `${icons.repeat} ${compact.format(s.reposts)}`,
      `${icons.heart} ${compact.format(s.likes)}`,
      ...stat(icons.view, s.views),
    ],
    timestamp: s.created_timestamp,
  };
}

async function buildThread(
  status: Status | null,
  getParent: (reply: Reply) => Promise<Status | null>,
  button: LinkButton,
) {
  if (!status) return null;

  const chain: Step[] = [{ status }];

  while (chain.length <= MAX_PARENTS) {
    const step = chain[chain.length - 1]!;
    const current = step.status;
    let parent: Status | null = null;

    if (current.quote?.type === "status") {
      parent = current.quote;
      step.via = "quote";
    } else if (current.replying_to?.status) {
      parent = await getParent(current.replying_to).catch(() => null);
      if (parent) step.via = "reply";
    }

    if (!parent) break;
    chain.push({ status: parent });
  }

  chain.reverse();

  return chain.map((step) =>
    postContainer(toPost(step), button, {
      total: chain.length,
    }),
  );
}

type RedditPost = {
  id: string;
  title: string;
  selftext?: string;
  author: string;
  subreddit: string;
  score?: number;
  num_comments?: number;
  created_utc: number;
  permalink?: string;
  over_18?: boolean;
  url?: string;
  url_overridden_by_dest?: string;
  media?: { reddit_video?: { fallback_url?: string } } | null;
  preview?: { images?: { source?: { url: string } }[] };
  gallery_data?: { items: { media_id: string }[] };
  media_metadata?: Record<string, { s?: { u?: string } }>;
};

async function fetchReddit(id: string) {
  const json = await fetchJson<RedditPost[] | { data?: RedditPost[] }>(
    `https://arctic-shift.photon-reddit.com/api/posts/ids?ids=${id}`,
  );
  return (Array.isArray(json) ? json : json?.data)?.[0] ?? null;
}

async function resolveRedditShare(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": DISCORD_UA },
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    const loc = res.headers.get("location");
    return loc?.match(/\/comments\/(\w+)/i)?.[1] ?? null;
  } catch {
    return null;
  }
}

function redditMedia(p: RedditPost): string[] {
  const meta = p.media_metadata;
  if (p.gallery_data && meta) {
    return p.gallery_data.items
      .map((item) => meta[item.media_id]?.s?.u)
      .filter((u): u is string => Boolean(u))
      .map(decodeHtml);
  }

  const video = p.media?.reddit_video?.fallback_url;
  if (video) return [decodeHtml(video)];

  const link = p.url_overridden_by_dest ?? p.url;
  if (link && /\.(?:png|jpe?g|gif|webp)(?:\?|$)/i.test(link)) return [link];

  const preview = p.preview?.images?.[0]?.source?.url;
  return preview ? [decodeHtml(preview)] : [];
}

function redditPost(p: RedditPost): Post {
  const nsfw = p.over_18 === true;
  const fresh = Date.now() / 1000 - p.created_utc < 86_400;

  return {
    url: p.permalink
      ? `https://www.reddit.com${p.permalink}`
      : `https://redd.it/${p.id}`,
    header: `**r/${p.subreddit}** · u/${p.author}`,
    text: decodeHtml(`### ${p.title}\n${p.selftext ?? ""}`),
    note: nsfw ? "NSFW: media hidden, open the post to view it" : undefined,
    media: nsfw ? [] : redditMedia(p),
    stats: fresh
      ? []
      : [
          ...stat(icons.upvote, p.score ?? 0),
          ...stat(icons.message, p.num_comments ?? 0),
        ],
    timestamp: p.created_utc,
  };
}

const INSTAGRAM_BUTTON: LinkButton = {
  label: "Open on Instagram",
  icon: icons.instagram,
};

async function fetchInstagram(path: string, url: string): Promise<Post | null> {
  try {
    const res = await fetch(`${INSTAGRAM_HOST}/${path}`, {
      headers: { "User-Agent": DISCORD_UA },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;

    const tags = ogTags(await res.text());
    const media = tags["og:video"] ?? tags["og:image"];
    if (!media && !tags["og:description"]) return null;

    return {
      url,
      header: `**${tags["og:title"] ?? "Instagram"}**`,
      text: tags["og:description"] ?? "",
      media: media ? [media] : [],
      stats: [],
    };
  } catch {
    return null;
  }
}

function handler(pattern: RegExp, run: LinkHandler["run"]): LinkHandler {
  return {
    pattern,
    async run(match) {
      const key = `${pattern.source}\0${match[0]}`;
      const cached = linkCache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        linkCache.delete(key);
        linkCache.set(key, cached);
        return cached.value;
      }
      if (cached) linkCache.delete(key);

      const pending = pendingLinks.get(key);
      if (pending) return pending;

      const request = (async () => {
        try {
          const result = await run(match);
          if (result) cacheLink(key, result);
          return result;
        } catch {
          return null;
        }
      })();
      pendingLinks.set(key, request);

      try {
        return await request;
      } finally {
        pendingLinks.delete(key);
      }
    },
  };
}

export const linkHandlers: LinkHandler[] = [
  handler(
    /https?:\/\/(?:www\.|mobile\.)?(?:x|twitter|fxtwitter|fixupx|vxtwitter|fixvx)\.com\/\w+\/(?:web\/)?status\/(\d+)/i,
    async ([, id]) =>
      buildThread(await fetchX(id!), (r) => fetchX(r.status), {
        label: "Open on X",
        icon: icons.twitter,
      }),
  ),

  handler(
    /https?:\/\/(?:www\.)?bsky\.app\/profile\/([\w.:-]+)\/post\/(\w+)/i,
    async ([, handle, rkey]) =>
      buildThread(
        await fetchBsky(handle!, rkey!),
        (r) => fetchBsky(r.screen_name, r.status),
        { label: "Open on Bluesky", icon: icons.globe },
      ),
  ),

  handler(
    /https?:\/\/(?:(?:(?:www|old|new|np|m)\.)?reddit\.com\/(?:(?:r\/\w+\/)?comments\/(\w+)|r\/\w+\/s\/(\w+))|redd\.it\/(\w+))/i,
    async ([url, commentsId, shareToken, shortId]) => {
      const id = shareToken
        ? await resolveRedditShare(url!)
        : (commentsId ?? shortId);
      if (!id) return null;

      const post = await fetchReddit(id);
      return (
        post &&
        single(redditPost(post), {
          label: "Open on Reddit",
          icon: icons.reddit,
        })
      );
    },
  ),

  handler(
    /https?:\/\/(?:(?:(?:www|m|music)\.)?youtube\.com\/(?:(?:watch|playlist)\?[^\s<]+|(?:shorts|live|embed|channel|c|user)\/[^\s<]+|@[\w.-]+[^\s<]*)|youtu\.be\/[\w-]+[^\s<]*)/i,
    async ([url]) => {
      const post = await fetchKoutube(url!);
      return (
        post &&
        single(post, {
          label: "Open on YouTube",
          icon: icons.youtube,
        })
      );
    },
  ),

  handler(
    /https?:\/\/(?:www\.)?instagr(?:am\.com|\.am)\/(?:[\w.]+\/)?(p|reels?|tv)\/([\w-]+)/i,
    async ([url, mediaKind, mediaCode]) => {
      const path = `${mediaKind!.toLowerCase().startsWith("reel") ? "reel" : mediaKind!.toLowerCase()}/${mediaCode}`;
      const post = await fetchInstagram(path, url!);
      return post && single(post, INSTAGRAM_BUTTON);
    },
  ),
];
