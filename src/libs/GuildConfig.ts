import prisma from "@/libs/Prisma";

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 1_000;

type CacheEntry = {
  enabled: boolean;
  expiresAt: number;
};

const mentionLinksCache = new Map<string, CacheEntry>();

function cacheMentionLinks(guildId: string, enabled: boolean): void {
  mentionLinksCache.delete(guildId);
  mentionLinksCache.set(guildId, {
    enabled,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  if (mentionLinksCache.size > MAX_CACHE_ENTRIES) {
    const oldest = mentionLinksCache.keys().next().value;
    if (oldest) mentionLinksCache.delete(oldest);
  }
}

export async function getMentionLinksEnabled(
  guildId: string,
): Promise<boolean> {
  const cached = mentionLinksCache.get(guildId);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.enabled;
  }

  mentionLinksCache.delete(guildId);

  const config = await prisma.guildConfig.findUnique({
    where: { guildId },
    select: { mentionLinksEnabled: true },
  });
  const enabled = config?.mentionLinksEnabled ?? false;

  cacheMentionLinks(guildId, enabled);
  return enabled;
}

export async function setMentionLinksEnabled(
  guildId: string,
  enabled: boolean,
): Promise<void> {
  await prisma.guildConfig.upsert({
    where: { guildId },
    update: { mentionLinksEnabled: enabled },
    create: { guildId, mentionLinksEnabled: enabled },
  });

  cacheMentionLinks(guildId, enabled);
}
