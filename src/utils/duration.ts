const UNIT_MS = {
  s: 1_000,
  m: 60 * 1_000,
  h: 60 * 60 * 1_000,
  d: 24 * 60 * 60 * 1_000,
} as const;

type Unit = keyof typeof UNIT_MS;

const SEGMENT = /(\d+(?:\.\d+)?)\s*([smhd])/gy;

export function parseDuration(input: string): number | null {
  const value = input.trim().toLowerCase();

  if (value.length === 0) return null;

  SEGMENT.lastIndex = 0;

  let total = 0;
  let consumed = 0;

  for (let match = SEGMENT.exec(value); match; match = SEGMENT.exec(value)) {
    total += Number(match[1]) * UNIT_MS[match[2] as Unit];
    consumed = SEGMENT.lastIndex;

    while (value[consumed] === " ") {
      consumed++;
    }

    SEGMENT.lastIndex = consumed;
  }

  if (consumed !== value.length) return null;

  return Number.isFinite(total) ? Math.round(total) : null;
}
