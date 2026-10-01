const TIME_ZONES = ["UTC", ...Intl.supportedValuesOf("timeZone")];
const timeZoneByName = new Map(
  TIME_ZONES.map((timeZone) => [timeZone.toLowerCase(), timeZone]),
);

function searchable(timeZone: string) {
  return timeZone.replaceAll("_", " ").replaceAll("/", " ").toLowerCase();
}

export function suggestTimeZones(query: string) {
  const search = query.trim().toLowerCase().replaceAll("_", " ");
  return TIME_ZONES.filter(
    (timeZone) =>
      !search ||
      timeZone.toLowerCase().includes(search) ||
      searchable(timeZone).includes(search),
  )
    .slice(0, 25)
    .map((timeZone) => ({
      name: timeZone.replaceAll("_", " ").slice(0, 100),
      value: timeZone,
    }));
}

export function normalizeTimeZone(value: string) {
  const timeZone = timeZoneByName.get(value.trim().toLowerCase());
  if (!timeZone) throw new Error("Choose a valid timezone from autocomplete");
  return timeZone;
}

export function formatTimeInZone(timeZone: string, date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    dateStyle: "full",
    timeStyle: "long",
  }).format(date);
}

function offsetMinutes(timeZone: string, date: Date) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return (
    (Date.UTC(
      values.year!,
      values.month! - 1,
      values.day,
      values.hour,
      values.minute,
      values.second,
    ) -
      date.getTime()) /
    60_000
  );
}

export function describeTimeDifference(
  first: string,
  second: string,
  date = new Date(),
) {
  const difference = offsetMinutes(second, date) - offsetMinutes(first, date);
  if (difference === 0) return "Both timezones currently have the same time";

  const absolute = Math.abs(difference);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  const duration = [
    hours ? `${hours} hour${hours === 1 ? "" : "s"}` : null,
    minutes ? `${minutes} minute${minutes === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" and ");

  return `**${second.replaceAll("_", " ")}** is ${duration} ${difference > 0 ? "ahead of" : "behind"} **${first.replaceAll("_", " ")}**`;
}
