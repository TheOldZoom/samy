type TranslationResponse = {
  responseData?: { translatedText?: string; detectedLanguage?: string };
  responseStatus?: number | string;
  responseDetails?: string;
};

type Translation = {
  text: string;
  from: string;
  to: string;
};

const cache = new Map<
  string,
  { expiresAt: number; value: Promise<Translation> }
>();

const LANGUAGES = [
  ["en", "English"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
  ["pt", "Portuguese"],
  ["it", "Italian"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
  ["zh-CN", "Chinese (Simplified)"],
  ["zh-TW", "Chinese (Traditional)"],
  ["ar", "Arabic"],
  ["hi", "Hindi"],
  ["ru", "Russian"],
  ["nl", "Dutch"],
  ["pl", "Polish"],
  ["tr", "Turkish"],
  ["sv", "Swedish"],
  ["no", "Norwegian"],
  ["da", "Danish"],
  ["fi", "Finnish"],
  ["cs", "Czech"],
  ["el", "Greek"],
  ["he", "Hebrew"],
  ["id", "Indonesian"],
  ["ms", "Malay"],
  ["th", "Thai"],
  ["vi", "Vietnamese"],
  ["uk", "Ukrainian"],
  ["ro", "Romanian"],
  ["hu", "Hungarian"],
  ["bg", "Bulgarian"],
  ["hr", "Croatian"],
  ["sk", "Slovak"],
  ["sl", "Slovenian"],
  ["sr", "Serbian"],
  ["ca", "Catalan"],
  ["et", "Estonian"],
  ["lv", "Latvian"],
  ["lt", "Lithuanian"],
  ["fa", "Persian"],
  ["ur", "Urdu"],
  ["bn", "Bengali"],
  ["ta", "Tamil"],
  ["te", "Telugu"],
] as const;

export function suggestLanguages(
  query: string,
  counterpart?: string | null,
  includeAutomatic = false,
) {
  const search = query.trim().toLowerCase();
  const other = counterpart?.trim().toLowerCase();

  const suggestions: Array<{ name: string; value: string }> = [];
  if (
    includeAutomatic &&
    (!search || "automatic detection auto autodetect".includes(search))
  ) {
    suggestions.push({ name: "Automatic detection", value: "auto" });
  }

  for (const [code, name] of LANGUAGES) {
    if (code.toLowerCase() === other) continue;
    if (search && !`${name} ${code}`.toLowerCase().includes(search)) continue;
    suggestions.push({ name: `${name} · ${code}`, value: code });
  }

  return suggestions.slice(0, 25);
}

function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

export function normalizeLanguage(value: string, allowAutomatic = false) {
  const language = value.trim().toLowerCase();
  if (
    allowAutomatic &&
    ["auto", "automatic", "autodetect"].includes(language)
  ) {
    return "Autodetect";
  }
  if (!/^[a-z]{2,3}(?:-[a-z]{2})?$/.test(language)) {
    throw new Error("Use a two-letter language code such as en, es, fr, or ja");
  }
  return language;
}

export function translate(text: string, fromInput: string, toInput: string) {
  const from = normalizeLanguage(fromInput, true);
  const to = normalizeLanguage(toInput);
  if (from === to) return Promise.resolve({ text, from, to });

  const key = `${from}:${to}:${text}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value = (async () => {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.search = new URLSearchParams({
      q: text,
      langpair: `${from}|${to}`,
    }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok)
      throw new Error(`Translation request failed (${response.status})`);
    const data = (await response.json()) as TranslationResponse;
    const translated = data.responseData?.translatedText;

    if (Number(data.responseStatus ?? 200) >= 400 || !translated) {
      throw new Error(data.responseDetails || "Translation was unavailable");
    }

    return {
      text: decodeEntities(translated),
      from:
        data.responseData?.detectedLanguage?.toLowerCase() ??
        (from === "Autodetect" ? "auto" : from),
      to,
    };
  })();

  cache.set(key, { expiresAt: Date.now() + 30 * 60 * 1000, value });
  if (cache.size > 100) cache.delete(cache.keys().next().value!);
  return value;
}
