import { ScriptError } from "./common/ScriptError";
import { parseDuration } from "@/utils/duration";

export const MAX_DELETE_DURATION_MS = 24 * 24 * 60 * 60 * 1000;

export type DetectedScript =
  | { kind: "embed"; source: string; content?: string; deleteMs?: number }
  | { kind: "multi-embed"; source: string; content?: string; deleteMs?: number }
  | { kind: "cv2"; source: string; content?: string; deleteMs?: number }
  | { kind: "text"; source: string; deleteMs?: number };

export function extractDeleteDirective(input: string): {
  cleaned: string;
  deleteMs?: number;
} {
  const match =
    /(?:\$v\s*)?\{(?:delete|del|autodelete)(?:\s*:\s*([^}]+))?\}\s*(?:\$v)?/i.exec(
      input,
    );

  if (!match || match.index === undefined) {
    return { cleaned: input };
  }

  const rawDuration = match[1]?.trim();
  if (!rawDuration) {
    throw new ScriptError(
      "MISSING_ARGUMENT",
      "{delete} requires a duration argument (e.g. {delete: 10s}, {delete: 1m}, {delete: 5m}).",
    );
  }

  const durationMs = parseDuration(rawDuration);
  if (durationMs === null || durationMs <= 0) {
    throw new ScriptError(
      "INVALID_VALUE",
      `Invalid duration "${rawDuration}" for delete parameter. Examples: 1s, 5m, 1h.`,
    );
  }

  if (durationMs > MAX_DELETE_DURATION_MS) {
    throw new ScriptError(
      "LIMIT_EXCEEDED",
      "Delete duration cannot exceed 24 days.",
    );
  }

  const before = input.slice(0, match.index);
  const after = input.slice(match.index + match[0].length);
  const cleaned = `${before} ${after}`.replace(/\s+/g, " ").trim();

  const secondCheck =
    /(?:\$v\s*)?\{(?:delete|del|autodelete)(?:\s*:\s*([^}]+))?\}\s*(?:\$v)?/i.exec(
      cleaned,
    );
  if (secondCheck) {
    throw new ScriptError(
      "DUPLICATE_PARAMETER",
      "Cannot specify multiple delete parameters.",
    );
  }

  return { cleaned, deleteMs: durationMs };
}

export function detectScriptKind(input: string): DetectedScript {
  const trimmed = input.trim();
  const marker = findScriptMarker(trimmed);

  if (!marker) {
    const { cleaned, deleteMs } = extractDeleteDirective(trimmed);
    return { kind: "text", source: cleaned, deleteMs };
  }

  const prefix = trimmed.slice(0, marker.index).trim();
  const source = trimmed.slice(marker.index + marker.length).trim();

  let content: string | undefined;
  let deleteMs: number | undefined;

  if (prefix.length > 0) {
    const extracted = extractDeleteDirective(prefix);
    content = extracted.cleaned.length > 0 ? extracted.cleaned : undefined;
    deleteMs = extracted.deleteMs;
  }

  if (marker.kind === "embed") {
    const embedCount = countEmbedMarkers(trimmed);
    if (embedCount > 1) {
      return {
        kind: "multi-embed",
        source: trimmed,
        content,
        deleteMs,
      };
    }
  }

  return {
    kind: marker.kind,
    source,
    content,
    deleteMs,
  };
}

function countEmbedMarkers(source: string): number {
  const regex = /\{embed\}\s*(?:\$v\s*)?/gi;
  const matches = source.match(regex);
  return matches ? matches.length : 0;
}

function findScriptMarker(
  input: string,
): { kind: "embed" | "cv2"; index: number; length: number } | null {
  const match = /\{(embed|cv2)\}\s*(?:\$v\s*)?/i.exec(input);
  if (!match || match.index === undefined) return null;

  return {
    kind: match[1]!.toLowerCase() as "embed" | "cv2",
    index: match.index,
    length: match[0].length,
  };
}

export function mergeMessageContent(
  ...parts: Array<string | undefined>
): string | undefined {
  const merged = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part && part.length > 0))
    .join("\n");

  return merged.length > 0 ? merged : undefined;
}
