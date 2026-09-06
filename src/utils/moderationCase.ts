import prisma from "@/libs/prisma";
import { ensureGuild } from "@/utils/guild";

export interface CreateModerationCaseOptions {
  guildId: string;
  type: string;
  userId: string;
  moderatorId: string;
  reason?: string | null;
  duration?: number | null;
  expiresAt?: Date | null;
}

export async function createModerationCase(
  options: CreateModerationCaseOptions,
): Promise<number> {
  const {
    guildId,
    type,
    userId,
    moderatorId,
    reason = null,
    duration = null,
    expiresAt = null,
  } = options;

  await ensureGuild(guildId);

  const lastCase = await prisma.moderationCase.findFirst({
    where: { guildId },
    orderBy: { caseNumber: "desc" },
    select: { caseNumber: true },
  });

  const caseNumber = (lastCase?.caseNumber ?? 0) + 1;

  await prisma.moderationCase.create({
    data: {
      guildId,
      caseNumber,
      type,
      userId,
      moderatorId,
      reason,
      duration,
      expiresAt,
    },
  });

  return caseNumber;
}
