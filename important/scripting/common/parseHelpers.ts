export function parseColor(raw: string): number | undefined {
  if (/^#([0-9A-Fa-f]{6})$/.test(raw)) {
    return Number.parseInt(raw.slice(1), 16);
  }

  if (/^#([0-9A-Fa-f]{3})$/.test(raw)) {
    const [r, g, b] = raw.slice(1).split("");
    return Number.parseInt(`${r}${r}${g}${g}${b}${b}`, 16);
  }

  if (/^0x[0-9A-Fa-f]{6}$/i.test(raw)) {
    return Number.parseInt(raw.slice(2), 16);
  }

  if (/^\d+$/.test(raw)) {
    const value = Number.parseInt(raw, 10);
    if (value >= 0 && value <= 0xffffff) return value;
  }

  return undefined;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
