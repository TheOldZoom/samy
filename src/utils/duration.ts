import parse from "parse-duration";

export function parseDuration(input: string): number | null {
  const value = input.trim();

  if (!value) {
    return null;
  }

  const normalized = /^\d+(?:\.\d+)?$/.test(value) ? `${value}s` : value;
  const duration = parse(normalized);

  if (duration === null || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }

  return duration;
}

export function extractDuration(input: string): {
  durationMs: number | null;
  rest: string;
} {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      durationMs: null,
      rest: trimmed,
    };
  }

  const [firstToken, ...restTokens] = trimmed.split(/\s+/);

  if (!firstToken) {
    return {
      durationMs: null,
      rest: trimmed,
    };
  }

  const durationMs = parseDuration(firstToken);

  if (durationMs === null) {
    return {
      durationMs: null,
      rest: trimmed,
    };
  }

  return {
    durationMs,
    rest: restTokens.join(" "),
  };
}

export function msToHuman(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts: string[] = [];

  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (secs && parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ") || "0s";
}
