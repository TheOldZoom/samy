import prettyMs from "pretty-ms";

export function formatDuration(totalSeconds: number) {
  return prettyMs(totalSeconds * 1000, {
    compact: true,
    secondsDecimalDigits: 0,
  });
}

export function toMB(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(1);
}

export function formatMs(value: number | null, fallback = "N/A") {
  return value === null ? fallback : `${value}ms`;
}
