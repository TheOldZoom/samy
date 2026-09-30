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

const INSTAGRAM_HOST =
  process.env.INSTAGRAM_EMBED_HOST ?? "https://ig.mynameistito.com";

const REDDIT_UA =
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

export type LinkHandler = {
  pattern: RegExp;
  run: (match: RegExpMatchArray) => Promise<Container[] | null>;
};

const compact = new Intl.NumberFormat("en", { notation: "compact" });

const decodeHtml = (s: string) =>
  s
    .replaceAll("&#x200B;", "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");

const stat = (icon: string, n?: number | null) =>
  n != null ? [`${icon} ${compact.format(n)}`] : [];

async function fetchJson<T>(url: string, timeout = 8000): Promise<T | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  return res.ok ? ((await res.json()) as T) : null;
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
      headers: { "User-Agent": REDDIT_UA },
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

function ogTags(html: string) {
  const tags: Record<string, string> = {};
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = tag.match(/(?:property|name)="([^"]+)"/i)?.[1];
    const value = tag.match(/content="([^"]*)"/i)?.[1];
    if (key && value !== undefined) tags[key] ??= decodeHtml(value);
  }
  return tags;
}

async function fetchInstagram(kind: string, code: string, url: string) {
  const res = await fetch(`${INSTAGRAM_HOST}/${kind}/${code}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
    },
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
  } satisfies Post;
}

export const linkHandlers: LinkHandler[] = [
  {
    pattern:
      /https?:\/\/(?:www\.|mobile\.)?(?:x|twitter|fxtwitter|fixupx|vxtwitter)\.com\/\w+\/status\/(\d+)/i,
    async run([, id]) {
      return buildThread(await fetchX(id!), (r) => fetchX(r.status), {
        label: "Open on X",
        icon: icons.twitter,
      });
    },
  },
  {
    pattern:
      /https?:\/\/(?:www\.)?bsky\.app\/profile\/([\w.:-]+)\/post\/(\w+)/i,
    async run([, handle, rkey]) {
      return buildThread(
        await fetchBsky(handle!, rkey!),
        (r) => fetchBsky(r.screen_name, r.status),
        { label: "Open on Bluesky", icon: icons.globe },
      );
    },
  },
  {
    pattern:
      /https?:\/\/(?:(?:(?:www|old|new|np|m)\.)?reddit\.com\/(?:(?:r\/\w+\/)?comments\/(\w+)|r\/\w+\/s\/(\w+))|redd\.it\/(\w+))/i,
    async run([url, commentsId, shareToken, shortId]) {
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
  },
  {
    pattern:
      /https?:\/\/(?:www\.)?instagram\.com\/(?:[\w.]+\/)?(p|reels?|tv)\/([\w-]+)/i,
    async run([url, kind, code]) {
      const post = await fetchInstagram(kind!, code!, url!);
      return (
        post &&
        single(post, { label: "Open on Instagram", icon: icons.instagram })
      );
    },
  },
];
