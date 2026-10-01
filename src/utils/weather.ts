type GeocodingResponse = {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    country?: string;
    admin1?: string;
  }>;
};

type ForecastResponse = {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  current_units: Record<string, string>;
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
  };
  daily_units: Record<string, string>;
};

export type Weather = {
  location: string;
  timezone: string;
  condition: string;
  temperature: string;
  feelsLike: string;
  range: string;
  humidity: string;
  wind: string;
  precipitation: string;
  precipitationChance: string;
  sunrise: string;
  sunset: string;
  updatedAt: string;
};

const weatherCache = new Map<
  string,
  { expiresAt: number; value: Promise<Weather | null> }
>();
const locationCache = new Map<
  string,
  { expiresAt: number; value: Promise<Array<{ name: string; value: string }>> }
>();

async function getJson<T>(url: URL, timeout = 8_000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  if (!response.ok)
    throw new Error(`Weather request failed (${response.status})`);
  return (await response.json()) as T;
}

function condition(code: number) {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55].includes(code)) return "Drizzle";
  if ([56, 57].includes(code)) return "Freezing drizzle";
  if ([61, 63, 65].includes(code)) return "Rain";
  if ([66, 67].includes(code)) return "Freezing rain";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([85, 86].includes(code)) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if ([96, 99].includes(code)) return "Thunderstorm with hail";
  return "Unknown conditions";
}

function time(value?: string) {
  return value?.split("T")[1] ?? "Unknown";
}

async function loadWeather(
  query: string,
  imperial: boolean,
): Promise<Weather | null> {
  const geocodingUrl = new URL(
    "https://geocoding-api.open-meteo.com/v1/search",
  );
  geocodingUrl.search = new URLSearchParams({
    name: query,
    count: "1",
    language: "en",
    format: "json",
  }).toString();
  const geocoding = await getJson<GeocodingResponse>(geocodingUrl);
  const place = geocoding.results?.[0];
  if (!place) return null;

  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.search = new URLSearchParams({
    latitude: place.latitude.toString(),
    longitude: place.longitude.toString(),
    timezone: place.timezone,
    forecast_days: "1",
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
    ].join(","),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "sunrise",
      "sunset",
    ].join(","),
    ...(imperial
      ? {
          temperature_unit: "fahrenheit",
          wind_speed_unit: "mph",
          precipitation_unit: "inch",
        }
      : {}),
  }).toString();
  const forecast = await getJson<ForecastResponse>(forecastUrl);
  const current = forecast.current;
  const daily = forecast.daily;
  const temperatureUnit =
    forecast.current_units.temperature_2m ?? (imperial ? "°F" : "°C");
  const windUnit =
    forecast.current_units.wind_speed_10m ?? (imperial ? "mph" : "km/h");
  const precipitationUnit =
    forecast.current_units.precipitation ?? (imperial ? "in" : "mm");
  const parts = [place.name, place.admin1, place.country].filter(
    (part, index, values): part is string =>
      Boolean(part) && values.indexOf(part) === index,
  );

  return {
    location: parts.join(", "),
    timezone: place.timezone,
    condition: condition(current.weather_code),
    temperature: `${current.temperature_2m}${temperatureUnit}`,
    feelsLike: `${current.apparent_temperature}${temperatureUnit}`,
    range: `${daily.temperature_2m_min[0]}${temperatureUnit} – ${daily.temperature_2m_max[0]}${temperatureUnit}`,
    humidity: `${current.relative_humidity_2m}%`,
    wind: `${current.wind_speed_10m} ${windUnit}`,
    precipitation: `${current.precipitation} ${precipitationUnit}`,
    precipitationChance: `${daily.precipitation_probability_max[0] ?? 0}%`,
    sunrise: time(daily.sunrise[0]),
    sunset: time(daily.sunset[0]),
    updatedAt: current.time.replace("T", " "),
  };
}

export function getWeather(query: string, unit: "metric" | "imperial") {
  const key = `${query.trim().toLowerCase()}:${unit}`;
  const cached = weatherCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value = loadWeather(query.trim(), unit === "imperial");
  weatherCache.set(key, { expiresAt: Date.now() + 5 * 60 * 1000, value });
  if (weatherCache.size > 100)
    weatherCache.delete(weatherCache.keys().next().value!);
  return value;
}

export function searchLocations(query: string) {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) return Promise.resolve([]);

  const cached = locationCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value = (async () => {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.search = new URLSearchParams({
      name: query.trim(),
      count: "10",
      language: "en",
      format: "json",
    }).toString();
    const response = await getJson<GeocodingResponse>(url, 2_500);
    const seen = new Set<string>();

    return (response.results ?? []).flatMap((place) => {
      const parts = [place.name, place.admin1, place.country].filter(
        (part, index, values): part is string =>
          Boolean(part) && values.indexOf(part) === index,
      );
      const label = parts.join(", ").slice(0, 100);
      if (!label || seen.has(label)) return [];
      seen.add(label);
      return [{ name: label, value: label }];
    });
  })().catch(() => []);

  locationCache.set(normalized, {
    expiresAt: Date.now() + 10 * 60 * 1000,
    value,
  });
  if (locationCache.size > 100) {
    locationCache.delete(locationCache.keys().next().value!);
  }
  return value;
}
