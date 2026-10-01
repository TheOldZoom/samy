import prisma from "@/libs/Prisma";

export async function findMarriage(userId: string) {
  const membership = await prisma.marriageMember.findUnique({
    where: { userId },
    include: {
      marriage: {
        include: { members: { include: { user: true } } },
      },
    },
  });

  return membership?.marriage ?? null;
}

export function partnerUser(
  marriage: Awaited<ReturnType<typeof findMarriage>>,
  userId: string,
) {
  return marriage?.members.find((member) => member.userId !== userId)?.user;
}

export function partnerId(
  marriage: Awaited<ReturnType<typeof findMarriage>>,
  userId: string,
) {
  return marriage?.members.find((member) => member.userId !== userId)?.userId;
}
