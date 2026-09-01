import Logger from "@/classes/Logger";
import type { LastFM } from "./client";

const logger = new Logger();

interface LastFMErrorResponse {
  error: number;
  message: string;
}

export async function request<T>(
  client: LastFM,
  method: string,
  params: Record<string, string | number>,
): Promise<T> {
  const searchParams = new URLSearchParams({
    method,
    api_key: client.apiKey,
    format: "json",
    ...Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, String(value)]),
    ),
  });

  const url = `${client.baseUrl}?${String(searchParams)}`;

  logger.debug("Last.fm request", {
    method,
    url,
    params: Object.fromEntries(searchParams.entries()),
    headers: {
      "User-Agent": client.userAgent,
    },
  });

  const response = await fetch(url, {
    headers: {
      "User-Agent": client.userAgent,
    },
  });

  const body = await response.text();

  logger.debug("Last.fm response", {
    method,
    status: response.status,
    statusText: response.statusText,
    body,
  });

  if (!response.ok) {
    logger.error("Last.fm request failed", {
      method,
      status: response.status,
      body,
    });

    throw new Error(`Last.fm request failed (${response.status}): ${body}`);
  }

  const data: unknown = JSON.parse(body);

  if (isLastFMError(data)) {
    logger.error("Last.fm API error", {
      method,
      code: data.error,
      message: data.message,
    });

    throw new Error(data.message);
  }

  logger.debug("Last.fm request completed", {
    method,
  });

  return data as T;
}

function isLastFMError(data: unknown): data is LastFMErrorResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    "message" in data
  );
}
