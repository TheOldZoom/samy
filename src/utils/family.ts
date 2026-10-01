import prisma from "@/libs/Prisma";

export type FamilyEdge = {
  from: string;
  to: string;
  type: "marriage" | "adoption";
};

type AdoptionLink = { parentId: string; childId: string };
type MarriageLink = { members: { userId: string }[] };

export const MAX_CHILDREN_PER_PARENT = 10;

export function createsAdoptionCycle(
  adoptions: AdoptionLink[],
  parentId: string,
  childId: string,
) {
  const children = new Map<string, string[]>();
  for (const adoption of adoptions) {
    const list = children.get(adoption.parentId) ?? [];
    list.push(adoption.childId);
    children.set(adoption.parentId, list);
  }

  const pending = [childId];
  const visited = new Set<string>();
  while (pending.length) {
    const current = pending.pop()!;
    if (current === parentId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    pending.push(...(children.get(current) ?? []));
  }

  return false;
}

function parentMap(adoptions: AdoptionLink[]) {
  return new Map(adoptions.map((link) => [link.childId, link.parentId]));
}

function lineage(userId: string, parents: Map<string, string>) {
  const result = new Set<string>();
  let current: string | undefined = userId;

  while (current && !result.has(current)) {
    result.add(current);
    current = parents.get(current);
  }

  return result;
}

function areMarried(
  leftId: string,
  rightId: string,
  marriages: MarriageLink[],
) {
  return marriages.some((marriage) => {
    const ids = marriage.members.map((member) => member.userId);
    return ids.includes(leftId) && ids.includes(rightId);
  });
}

export function marriageRestrictionReason(
  leftId: string,
  rightId: string,
  adoptions: AdoptionLink[],
  marriages: MarriageLink[],
) {
  if (leftId === rightId) return "You cannot marry yourself.";

  const parents = parentMap(adoptions);
  const leftParent = parents.get(leftId);
  const rightParent = parents.get(rightId);

  if (leftParent === rightId || rightParent === leftId) {
    return "Parents and children cannot marry each other.";
  }
  if (leftParent && leftParent === rightParent) {
    return "Siblings cannot marry each other.";
  }
  if (
    leftParent &&
    rightParent &&
    areMarried(leftParent, rightParent, marriages)
  ) {
    return "Step-siblings cannot marry each other.";
  }

  const leftLineage = lineage(leftId, parents);
  const rightLineage = lineage(rightId, parents);
  if ([...leftLineage].some((id) => rightLineage.has(id))) {
    return "People in the same adoption lineage cannot marry each other.";
  }

  return null;
}

export function adoptionRestrictionReason(
  parentId: string,
  childId: string,
  adoptions: AdoptionLink[],
  marriages: MarriageLink[],
) {
  if (parentId === childId) return "You cannot adopt yourself.";
  if (adoptions.some((adoption) => adoption.childId === childId)) {
    return "That user already has an adoption parent.";
  }
  if (areMarried(parentId, childId, marriages)) {
    return "You cannot adopt your spouse.";
  }
  if (
    adoptions.filter((adoption) => adoption.parentId === parentId).length >=
    MAX_CHILDREN_PER_PARENT
  ) {
    return `A parent can have at most ${MAX_CHILDREN_PER_PARENT} adopted children.`;
  }
  if (createsAdoptionCycle(adoptions, parentId, childId)) {
    return "That adoption would create an impossible family cycle.";
  }

  const updatedAdoptions = [...adoptions, { parentId, childId }];
  for (const marriage of marriages) {
    const [left, right] = marriage.members;
    if (!left || !right) continue;
    const before = marriageRestrictionReason(
      left.userId,
      right.userId,
      adoptions,
      marriages,
    );
    const after = marriageRestrictionReason(
      left.userId,
      right.userId,
      updatedAdoptions,
      marriages,
    );
    if (!before && after) {
      return "That adoption would turn an existing marriage into a family relationship.";
    }
  }

  return null;
}

export async function loadFamilyGraph(rootId: string, limit = 24) {
  const ids = new Set([rootId]);
  const edges = new Map<string, FamilyEdge>();
  let frontier = [rootId];
  let truncated = false;

  while (frontier.length) {
    const [adoptions, memberships] = await Promise.all([
      prisma.adoption.findMany({
        where: {
          OR: [{ parentId: { in: frontier } }, { childId: { in: frontier } }],
        },
      }),
      prisma.marriageMember.findMany({
        where: { userId: { in: frontier } },
        include: { marriage: { include: { members: true } } },
      }),
    ]);
    const discovered: string[] = [];
    const foundEdges: FamilyEdge[] = adoptions.map((adoption) => ({
      from: adoption.parentId,
      to: adoption.childId,
      type: "adoption",
    }));

    for (const membership of memberships) {
      const spouse = membership.marriage.members.find(
        (member) => member.userId !== membership.userId,
      );
      if (spouse) {
        const [from, to] = [membership.userId, spouse.userId].sort();
        foundEdges.push({ from: from!, to: to!, type: "marriage" });
      }
    }

    for (const edge of foundEdges) {
      for (const id of [edge.from, edge.to]) {
        if (ids.has(id)) continue;
        if (ids.size >= limit) {
          truncated = true;
          continue;
        }
        ids.add(id);
        discovered.push(id);
      }

      if (ids.has(edge.from) && ids.has(edge.to)) {
        const key = `${edge.type}:${edge.from}:${edge.to}`;
        edges.set(key, edge);
      }
    }

    frontier = discovered;
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...ids] } },
  });

  return { ids: [...ids], users, edges: [...edges.values()], truncated };
}
