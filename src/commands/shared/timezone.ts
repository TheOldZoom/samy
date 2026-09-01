import type Client from "@/classes/client";

const TIMEZONE_ALIASES: Record<string, string> = {
  EST: "America/New_York",
  EDT: "America/New_York",
  CST: "America/Chicago",
  CDT: "America/Chicago",
  MST: "America/Denver",
  MDT: "America/Denver",
  PST: "America/Los_Angeles",
  PDT: "America/Los_Angeles",
  AKST: "America/Anchorage",
  AKDT: "America/Anchorage",
  HST: "Pacific/Honolulu",
  HAST: "Pacific/Honolulu",
  GMT: "UTC",
  UTC: "UTC",
  BST: "Europe/London",
  CET: "Europe/Paris",
  CEST: "Europe/Paris",
  EET: "Europe/Helsinki",
  EEST: "Europe/Helsinki",
  JST: "Asia/Tokyo",
  KST: "Asia/Seoul",
  IST: "Asia/Kolkata",
  AEST: "Australia/Sydney",
  AEDT: "Australia/Sydney",
  AWST: "Australia/Perth",
  ACST: "Australia/Adelaide",
  ACDT: "Australia/Adelaide",
  NZST: "Pacific/Auckland",
  NZDT: "Pacific/Auckland",
  BRT: "America/Sao_Paulo",
  BRST: "America/Sao_Paulo",
};

export function resolveTimezone(input: string): string | null {
  const trimmed = input.trim();
  const uppercase = trimmed.toUpperCase();

  if (TIMEZONE_ALIASES[uppercase]) {
    return TIMEZONE_ALIASES[uppercase];
  }

  const offsetMatch = trimmed.match(
    /^(?:UTC|GMT)?\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i,
  );
  if (offsetMatch) {
    const sign = offsetMatch[1];
    const hours = parseInt(offsetMatch[2]!, 10);
    const minutes = offsetMatch[3] ? parseInt(offsetMatch[3], 10) : 0;

    if (hours <= 14 && minutes < 60) {
      const invertedSign = sign === "+" ? "-" : "+";
      const tzName = minutes === 0 ? `Etc/GMT${invertedSign}${hours}` : null;
      if (tzName && isValidTimezone(tzName)) {
        return tzName;
      }
    }
  }

  if (isValidTimezone(trimmed)) {
    return trimmed;
  }

  const formatted = trimmed
    .split("/")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part
          .slice(1)
          .toLowerCase()
          .replace(/_([a-z])/g, (_, c: string) => `_${c.toUpperCase()}`),
    )
    .join("/");

  if (isValidTimezone(formatted)) {
    return formatted;
  }

  return null;
}

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function getFormattedTime(
  tz: string,
  date = new Date(),
): {
  timeString: string;
  dateString: string;
  offsetString: string;
  hour24: number;
} {
  const dtfTime = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const dtfDate = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const dtfOffset = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "short",
  });

  const dtfHour24 = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
  });

  const partsOffset = dtfOffset.formatToParts(date);
  const offsetPart =
    partsOffset.find((p) => p.type === "timeZoneName")?.value ?? tz;

  const hour24Str = dtfHour24.format(date);
  const hour24 = parseInt(hour24Str, 10);

  return {
    timeString: dtfTime.format(date),
    dateString: dtfDate.format(date),
    offsetString: offsetPart,
    hour24,
  };
}

export function getTimezoneDifference(
  tz1: string,
  tz2: string,
  date = new Date(),
): string {
  const getTimezoneOffsetMinutes = (timeZone: string) => {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = Object.fromEntries(
      dtf.formatToParts(date).map((p) => [p.type, p.value]),
    );
    const asUtc = Date.UTC(
      parseInt(parts.year!, 10),
      parseInt(parts.month!, 10) - 1,
      parseInt(parts.day!, 10),
      parseInt(parts.hour!, 10) % 24,
      parseInt(parts.minute!, 10),
      parseInt(parts.second!, 10),
    );
    return (asUtc - date.getTime()) / (1000 * 60);
  };

  const offset1 = getTimezoneOffsetMinutes(tz1);
  const offset2 = getTimezoneOffsetMinutes(tz2);
  const diffMinutes = offset1 - offset2;

  if (diffMinutes === 0) {
    return "Same timezone";
  }

  const diffHours = Math.abs(diffMinutes) / 60;
  const hoursFormatted = Number.isInteger(diffHours)
    ? `${diffHours}`
    : `${diffHours.toFixed(1)}`;
  const suffix = diffHours === 1 ? "hour" : "hours";

  return diffMinutes > 0
    ? `${hoursFormatted} ${suffix} ahead of you`
    : `${hoursFormatted} ${suffix} behind you`;
}

export async function setTimezone(
  client: Client,
  userId: string,
  input: string,
) {
  const resolvedTz = resolveTimezone(input);
  if (!resolvedTz) {
    throw new Error(
      `Invalid timezone: "${input}". Please provide a valid IANA timezone (e.g. \`America/New_York\`, \`Europe/London\`, \`Asia/Tokyo\`, \`UTC\`) or standard abbreviation (e.g. \`EST\`, \`PST\`, \`CET\`).`,
    );
  }

  await client.prisma.user.upsert({
    where: { id: userId },
    update: { timezone: resolvedTz },
    create: { id: userId, timezone: resolvedTz },
  });

  return {
    timezone: resolvedTz,
    ...getFormattedTime(resolvedTz),
  };
}

export async function getTimezone(client: Client, userId: string) {
  const user = await client.prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.timezone) {
    return null;
  }

  return {
    timezone: user.timezone,
    ...getFormattedTime(user.timezone),
  };
}

export async function unsetTimezone(client: Client, userId: string) {
  const existing = await client.prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existing || !existing.timezone) {
    return false;
  }

  await client.prisma.user.update({
    where: { id: userId },
    data: { timezone: null },
  });

  return true;
}
