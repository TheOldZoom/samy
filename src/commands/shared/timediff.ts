import { icons } from "@/utils/icons";
import type Client from "@/classes/client";
import { Container, Text } from "@/ui/components";
import errorUI from "@/ui/error";

const DISCORD_EPOCH = 1_420_070_400_000;

function snowflakeToTimestamp(snowflake: string): number | null {
  const id = BigInt(snowflake);
  if (id <= 0) return null;
  return Number(id >> 22n) + DISCORD_EPOCH;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  const parts: string[] = [];
  if (weeks > 0) parts.push(`${weeks}w`);
  if (days % 7 > 0) parts.push(`${days % 7}d`);
  if (hours % 24 > 0) parts.push(`${hours % 24}h`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
  if (seconds % 60 > 0) parts.push(`${seconds % 60}s`);

  return parts.join(" ") || "0s";
}

export function TimediffResult(
  client: Client,
  snowflake1: string,
  snowflake2: string,
) {
  const ts1 = snowflakeToTimestamp(snowflake1);
  const ts2 = snowflakeToTimestamp(snowflake2);

  if (!ts1) {
    return errorUI(
      icons.clock +
        " " +
        client.i18n.t("commands.timediff.invalid", { id: snowflake1 }),
    );
  }

  if (!ts2) {
    return errorUI(
      icons.clock +
        " " +
        client.i18n.t("commands.timediff.invalid", { id: snowflake2 }),
    );
  }

  const diff = Math.abs(ts2 - ts1);
  const diffFormatted = formatDuration(diff);

  return new Container().text(
    Text(
      icons.clock +
        " " +
        client.i18n.t("commands.timediff.result", {
          ts1: Math.floor(ts1 / 1000),
          ts2: Math.floor(ts2 / 1000),
          diff: diffFormatted,
        }),
    ),
  );
}

export { snowflakeToTimestamp };
