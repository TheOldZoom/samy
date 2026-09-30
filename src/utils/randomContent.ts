import { icons } from "@/utils/icons";
import {
  ActionRow,
  Buttons,
  Container,
  Media,
  Text,
  v2,
} from "@/utils/ui/components";

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function imageResponse(
  icon: string,
  heading: string,
  imageUrl: string,
  source?: { label: string; url: string },
) {
  const container = new Container()
    .text(Text(`-# ${icon} · ${heading}`))
    .media(Media(imageUrl));

  if (source) {
    container.actionRow(ActionRow(Buttons.link(source.label, source.url)));
  }

  return {
    ...v2(container),
    allowedMentions: { parse: [] },
  };
}

export function textResponse(icon: string, heading: string, content: string) {
  return {
    ...v2(new Container().text(Text(`-# ${icon} · ${heading}\n${content}`))),
    allowedMentions: { parse: [] },
  };
}

export function failureResponse(kind: string) {
  return {
    ...textResponse(
      icons.Wrong,
      `Couldn't get a ${kind}`,
      "The content service is unavailable right now. Please try again.",
    ),
    ephemeral: true,
  };
}
