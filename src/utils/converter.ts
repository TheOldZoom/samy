type Unit = {
  category: string;
  symbol: string;
  factor?: number;
  toBase?: (value: number) => number;
  fromBase?: (value: number) => number;
};

const units = new Map<string, Unit>();

function add(
  category: string,
  symbol: string,
  factor: number,
  aliases: string[],
) {
  const unit = { category, symbol, factor };
  for (const alias of [symbol, ...aliases])
    units.set(alias.toLowerCase(), unit);
}

add("length", "mm", 0.001, ["millimeter", "millimeters"]);
add("length", "cm", 0.01, ["centimeter", "centimeters"]);
add("length", "m", 1, ["meter", "meters"]);
add("length", "km", 1000, ["kilometer", "kilometers"]);
add("length", "in", 0.0254, ["inch", "inches"]);
add("length", "ft", 0.3048, ["foot", "feet"]);
add("length", "yd", 0.9144, ["yard", "yards"]);
add("length", "mi", 1609.344, ["mile", "miles"]);

add("mass", "mg", 0.001, ["milligram", "milligrams"]);
add("mass", "g", 1, ["gram", "grams"]);
add("mass", "kg", 1000, ["kilogram", "kilograms"]);
add("mass", "oz", 28.349523125, ["ounce", "ounces"]);
add("mass", "lb", 453.59237, ["lbs", "pound", "pounds"]);

add("volume", "ml", 0.001, ["milliliter", "milliliters"]);
add("volume", "l", 1, ["liter", "liters", "litre", "litres"]);
add("volume", "tsp", 0.00492892159375, ["teaspoon", "teaspoons"]);
add("volume", "tbsp", 0.01478676478125, ["tablespoon", "tablespoons"]);
add("volume", "cup", 0.2365882365, ["cups"]);
add("volume", "pt", 0.473176473, ["pint", "pints"]);
add("volume", "qt", 0.946352946, ["quart", "quarts"]);
add("volume", "gal", 3.785411784, ["gallon", "gallons"]);

add("area", "m²", 1, ["m2", "squaremeter", "squaremeters"]);
add("area", "km²", 1_000_000, ["km2", "squarekilometer", "squarekilometers"]);
add("area", "ft²", 0.09290304, ["ft2", "squarefoot", "squarefeet"]);
add("area", "acre", 4046.8564224, ["acres"]);
add("area", "ha", 10_000, ["hectare", "hectares"]);

add("speed", "m/s", 1, ["mps"]);
add("speed", "km/h", 1 / 3.6, ["kmh", "kph"]);
add("speed", "mph", 0.44704, []);
add("speed", "kn", 0.514444, ["knot", "knots"]);

add("time", "ms", 0.001, ["millisecond", "milliseconds"]);
add("time", "s", 1, ["sec", "second", "seconds"]);
add("time", "min", 60, ["minute", "minutes"]);
add("time", "h", 3600, ["hr", "hour", "hours"]);
add("time", "day", 86_400, ["days"]);
add("time", "week", 604_800, ["weeks"]);

add("data", "B", 1, ["byte", "bytes"]);
add("data", "KB", 1000, ["kilobyte", "kilobytes"]);
add("data", "MB", 1_000_000, ["megabyte", "megabytes"]);
add("data", "GB", 1_000_000_000, ["gigabyte", "gigabytes"]);
add("data", "TB", 1_000_000_000_000, ["terabyte", "terabytes"]);

add("angle", "rad", 1, ["radian", "radians"]);
add("angle", "deg", Math.PI / 180, ["degree", "degrees", "°"]);

const temperatures: Record<string, Unit> = {
  c: {
    category: "temperature",
    symbol: "°C",
    toBase: (value) => value + 273.15,
    fromBase: (value) => value - 273.15,
  },
  f: {
    category: "temperature",
    symbol: "°F",
    toBase: (value) => ((value - 32) * 5) / 9 + 273.15,
    fromBase: (value) => ((value - 273.15) * 9) / 5 + 32,
  },
  k: {
    category: "temperature",
    symbol: "K",
    toBase: (value) => value,
    fromBase: (value) => value,
  },
};

for (const [key, unit] of Object.entries(temperatures)) {
  const names =
    key === "c"
      ? ["celsius", "°c"]
      : key === "f"
        ? ["fahrenheit", "°f"]
        : ["kelvin"];
  for (const alias of [key, ...names]) units.set(alias, unit);
}

const FALLBACK_CURRENCIES = [
  ["USD", "US Dollar"],
  ["EUR", "Euro"],
  ["GBP", "British Pound"],
  ["JPY", "Japanese Yen"],
  ["CAD", "Canadian Dollar"],
  ["AUD", "Australian Dollar"],
  ["CHF", "Swiss Franc"],
  ["CNY", "Chinese Yuan"],
  ["HKD", "Hong Kong Dollar"],
  ["NZD", "New Zealand Dollar"],
  ["SEK", "Swedish Krona"],
  ["KRW", "South Korean Won"],
  ["SGD", "Singapore Dollar"],
  ["NOK", "Norwegian Krone"],
  ["MXN", "Mexican Peso"],
  ["INR", "Indian Rupee"],
  ["BRL", "Brazilian Real"],
  ["ZAR", "South African Rand"],
  ["CRC", "Costa Rican Colón"],
  ["AED", "UAE Dirham"],
] as const;

type Currency = {
  iso_code: string;
  name: string;
  symbol?: string;
};

let currenciesCache:
  { expiresAt: number; value: Promise<readonly Currency[]> } | undefined;

function currencies() {
  if (currenciesCache && currenciesCache.expiresAt > Date.now()) {
    return currenciesCache.value;
  }

  const value = fetch("https://api.frankfurter.dev/v2/currencies", {
    signal: AbortSignal.timeout(3_000),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error("Couldn't load currencies");
      return (await response.json()) as Currency[];
    })
    .catch((): Currency[] =>
      FALLBACK_CURRENCIES.map(([iso_code, name]) => ({ iso_code, name })),
    );

  currenciesCache = {
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    value,
  };
  return value;
}

const aliasesByUnit = new Map<Unit, string[]>();
for (const [alias, unit] of units) {
  const aliases = aliasesByUnit.get(unit) ?? [];
  aliases.push(alias);
  aliasesByUnit.set(unit, aliases);
}

export async function suggestConversions(
  query: string,
  counterpart?: string | null,
) {
  const search = query.trim().toLowerCase();
  const counterpartUnit = counterpart
    ? units.get(counterpart.trim().toLowerCase())
    : undefined;
  const counterpartCurrency =
    counterpart && /^[a-z]{3}$/i.test(counterpart.trim()) && !counterpartUnit;
  const suggestions: Array<{ name: string; value: string }> = [];

  if (!counterpartCurrency) {
    for (const [unit, aliases] of aliasesByUnit) {
      if (counterpartUnit && unit.category !== counterpartUnit.category)
        continue;

      const searchable =
        `${unit.category} ${unit.symbol} ${aliases.join(" ")}`.toLowerCase();
      if (search && !searchable.includes(search)) continue;
      suggestions.push({
        name: `${unit.category[0]!.toUpperCase()}${unit.category.slice(1)} · ${unit.symbol}`,
        value: unit.symbol,
      });
    }
  }

  if (!counterpartUnit) {
    for (const currency of await currencies()) {
      const { iso_code: code, name, symbol } = currency;
      if (
        search &&
        !`${code} ${name} ${symbol ?? ""}`.toLowerCase().includes(search)
      ) {
        continue;
      }
      suggestions.push({
        name: `${code} · ${name}${symbol ? ` (${symbol})` : ""}`.slice(0, 100),
        value: code,
      });
    }
  }

  return suggestions.slice(0, 25);
}

function formatNumber(value: number) {
  if ((Math.abs(value) >= 1e12 || Math.abs(value) < 1e-6) && value !== 0) {
    return value.toExponential(8).replace(/\.?0+e/, "e");
  }
  return new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: 12,
  }).format(value);
}

type CurrencyRate = { date: string; base: string; quote: string; rate: number };
const currencyCache = new Map<
  string,
  { expiresAt: number; value: CurrencyRate }
>();

async function currencyRate(from: string, to: string) {
  if (from === to) return { date: "", base: from, quote: to, rate: 1 };
  const key = `${from}:${to}`;
  const cached = currencyCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const response = await fetch(
    `https://api.frankfurter.dev/v2/rate/${from.toLowerCase()}/${to.toLowerCase()}`,
    { signal: AbortSignal.timeout(8_000) },
  );
  if (!response.ok) throw new Error("Unsupported currency code");
  const value = (await response.json()) as CurrencyRate;
  currencyCache.set(key, { expiresAt: Date.now() + 60 * 60 * 1000, value });
  if (currencyCache.size > 100)
    currencyCache.delete(currencyCache.keys().next().value!);
  return value;
}

export type Conversion = {
  input: string;
  output: string;
  detail: string;
  exchangeRate?: string;
};

export async function convert(
  value: number,
  fromInput: string,
  toInput: string,
): Promise<Conversion> {
  if (!Number.isFinite(value)) throw new Error("Value must be a finite number");
  const fromUnit = units.get(fromInput.trim().toLowerCase());
  const toUnit = units.get(toInput.trim().toLowerCase());

  if (fromUnit || toUnit) {
    if (!fromUnit || !toUnit || fromUnit.category !== toUnit.category) {
      throw new Error("Those units are not compatible");
    }

    const base = fromUnit.toBase
      ? fromUnit.toBase(value)
      : value * fromUnit.factor!;
    const result = toUnit.fromBase
      ? toUnit.fromBase(base)
      : base / toUnit.factor!;
    return {
      input: `${formatNumber(value)} ${fromUnit.symbol}`,
      output: `${formatNumber(result)} ${toUnit.symbol}`,
      detail: fromUnit.category,
    };
  }

  const from = fromInput.trim().toUpperCase();
  const to = toInput.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
    throw new Error("Use compatible units or three-letter currency codes");
  }

  const rate = await currencyRate(from, to);
  return {
    input: `${formatNumber(value)} ${from}`,
    output: `${formatNumber(value * rate.rate)} ${to}`,
    detail: rate.date ? `Market rate from ${rate.date}` : "Same currency",
    exchangeRate: `1 ${from} = ${formatNumber(rate.rate)} ${to}`,
  };
}
