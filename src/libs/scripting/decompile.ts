import {
  ButtonStyle,
  ComponentType,
  SeparatorSpacingSize,
  type APIEmbed,
  type APIMessageTopLevelComponent,
  type Embed,
} from "discord.js";

type EmbedInput = APIEmbed | Embed | { toJSON(): APIEmbed };

export interface MessageScriptInput {
  content?: string;
  embeds?: APIEmbed[];
  components?: APIMessageTopLevelComponent[];
  deleteAfter?: string;
}

type AnyComponent = {
  type?: number;
  components?: AnyComponent[];
  accessory?: AnyComponent;
  content?: string;
  accent_color?: number | null;
  divider?: boolean;
  spacing?: number;
  items?: Array<{ media?: { url?: string | null } | null }>;
  media?: { url?: string | null } | null;
  label?: string;
  url?: string;
  style?: number;
  disabled?: boolean;
};

export function decompileEmbedToScript(embed: EmbedInput): string {
  const data = normalizeEmbed(embed);
  const parts: string[] = [];

  pushParam(parts, "title", data.title);
  pushParam(parts, "description", data.description);
  if (data.color !== undefined)
    pushParam(parts, "color", formatColor(data.color));
  pushParam(parts, "url", data.url);
  pushParam(parts, "thumbnail", data.thumbnail?.url);
  pushParam(parts, "image", data.image?.url);
  if (data.timestamp) parts.push("{timestamp}");

  if (data.author?.name) {
    pushParam(
      parts,
      "author",
      data.author.name,
      data.author.icon_url,
      data.author.url,
    );
  }

  if (data.footer?.text) {
    pushParam(parts, "footer", data.footer.text, data.footer.icon_url);
  }

  for (const field of data.fields ?? []) {
    pushParam(
      parts,
      "field",
      field.name,
      field.value,
      field.inline ? "inline" : undefined,
    );
  }

  return joinParts(parts);
}

export function decompileCv2ToScript(
  components: APIMessageTopLevelComponent[],
): string {
  return joinParts(
    components.flatMap((component) => decompileCv2Component(component)),
  );
}

export function decompileMessageToScript(message: MessageScriptInput): string {
  const components = message.components ?? [];
  const embeds = message.embeds ?? [];
  const content = message.content;

  const parts: string[] = [];
  if (message.deleteAfter) {
    pushParam(parts, "delete", message.deleteAfter);
  }

  if (
    hasCv2Components(components) ||
    (embeds.length === 0 && components.length > 0)
  ) {
    if (content && content.trim().length > 0) {
      pushParam(parts, "text", content);
    }
    parts.push(decompileCv2ToScript(components));
    return joinScript("cv2", parts);
  }

  if (embeds.length > 0) {
    if (embeds.length > 1) {
      throw new Error(
        "Cannot decompile multiple embeds because this script compiler supports one embed per script.",
      );
    }

    if (content && content.trim().length > 0) {
      pushParam(parts, "content", content);
    }
    parts.push(decompileEmbedToScript(embeds[0]!));
    parts.push(...decompileEmbedButtons(components));
    return joinScript("embed", parts);
  }

  return content ?? "";
}

function decompileCv2Component(
  component: APIMessageTopLevelComponent,
): string[] {
  const item = component as AnyComponent;

  switch (item.type) {
    case ComponentType.Container:
      return decompileContainer(item);
    case ComponentType.Section:
      return decompileSection(item);
    case ComponentType.TextDisplay:
      return [param("text", requiredString(item.content, "text content"))];
    case ComponentType.Separator:
      return [separatorParam(item)];
    case ComponentType.MediaGallery:
      return [param("media", ...requiredStrings(mediaUrls(item), "media url"))];
    case ComponentType.ActionRow:
      return decompileActionRow(item);
    case ComponentType.Button:
      return decompileButton(item);
    default:
      return [];
  }
}

function decompileContainer(component: AnyComponent): string[] {
  const parts = [
    component.accent_color === undefined || component.accent_color === null
      ? "{container}"
      : param("container", formatColor(component.accent_color)),
  ];

  for (const child of component.components ?? []) {
    parts.push(...decompileCv2Component(child as APIMessageTopLevelComponent));
  }

  return parts;
}

function decompileSection(component: AnyComponent): string[] {
  const parts = ["{section}"];

  for (const child of component.components ?? []) {
    if (child.type === ComponentType.TextDisplay) {
      parts.push(param("text", requiredString(child.content, "text content")));
    }
  }

  if (component.accessory?.type === ComponentType.Button) {
    parts.push(...decompileButton(component.accessory));
  } else if (component.accessory?.type === ComponentType.Thumbnail) {
    parts.push(
      param(
        "thumbnail",
        requiredString(component.accessory.media?.url, "thumbnail url"),
      ),
    );
  }

  return parts;
}

function decompileButton(component: AnyComponent): string[] {
  if (component.type !== ComponentType.Button) {
    return [];
  }
  
  if (component.style !== ButtonStyle.Link) {
    return [];
  }

  return [
    param(
      "button",
      requiredString(component.label, "button label"),
      requiredString(component.url, "button url"),
      "disabled",
    ),
  ];
}

function decompileActionRow(component: AnyComponent): string[] {
  return (component.components ?? []).flatMap(decompileButton);
}

function decompileEmbedButtons(
  components: APIMessageTopLevelComponent[],
): string[] {
  return components.flatMap((component) => {
    const item = component as AnyComponent;
    if (item.type !== ComponentType.ActionRow) return [];
    return (item.components ?? []).flatMap(decompileButton);
  });
}

function separatorParam(component: AnyComponent): string {
  const spacing =
    component.spacing === SeparatorSpacingSize.Large ? "large" : "small";
  const divider = component.divider === false ? "hidden" : undefined;

  if (spacing === "small" && divider === undefined) return "{separator}";
  return param("separator", spacing, divider);
}

function mediaUrls(component: AnyComponent): string[] {
  return (component.items ?? [])
    .map((item) => item.media?.url)
    .filter((url): url is string => typeof url === "string" && url.length > 0);
}

function hasCv2Components(components: APIMessageTopLevelComponent[]): boolean {
  return components.some((component) => {
    const type = (component as AnyComponent).type;
    return (
      type === ComponentType.Container ||
      type === ComponentType.Section ||
      type === ComponentType.TextDisplay ||
      type === ComponentType.Separator ||
      type === ComponentType.MediaGallery
    );
  });
}

function normalizeEmbed(embed: EmbedInput): APIEmbed {
  if ("toJSON" in embed && typeof embed.toJSON === "function") {
    return embed.toJSON();
  }

  return embed as APIEmbed;
}

function pushParam(
  parts: string[],
  name: string,
  ...values: Array<string | number | boolean | undefined | null>
): void {
  if (values[0] === undefined || values[0] === null) return;
  const tag = param(name, ...values);
  if (tag) parts.push(tag);
}

function param(
  name: string,
  ...values: Array<string | number | boolean | undefined | null>
): string {
  const args = values.filter(
    (value): value is string | number | boolean =>
      value !== undefined && value !== null,
  );

  if (args.length === 0) return `{${name}}`;
  return `{${name}: ${args.map((value) => formatArg(String(value))).join("&&")}}`;
}

function escapeDelimiters(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("&&", "\\&\\&");
}

function formatArg(value: string): string {
  if (value.length === 0) {
    throw new Error("Cannot decompile an empty script argument.");
  }

  if (value.trim() !== value) {
    throw new Error(
      `Cannot decompile a value with leading or trailing whitespace: ${JSON.stringify(value)}.`,
    );
  }

  if (value.includes("$v")) {
    throw new Error(
      `Cannot decompile value containing a reserved script delimiter: ${JSON.stringify(value)}.`,
    );
  }

  assertRepresentableBraces(value);
  return escapeDelimiters(value);
}

function requiredString(
  value: string | undefined | null,
  label: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Cannot decompile component with missing ${label}.`);
  }

  return value;
}

function requiredStrings(values: string[], label: string): string[] {
  if (values.length === 0) {
    throw new Error(`Cannot decompile component with missing ${label}.`);
  }

  return values;
}

function assertRepresentableBraces(value: string): void {
  const variablePattern =
    /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;
  let index = 0;

  while (index < value.length) {
    const open = value.indexOf("{", index);
    const strayClose = value.indexOf("}", index);
    if (open === -1) {
      if (strayClose !== -1) {
        throw new Error(
          `Cannot decompile value containing an unmatched }: ${JSON.stringify(value)}.`,
        );
      }
      return;
    }

    if (strayClose !== -1 && strayClose < open) {
      throw new Error(
        `Cannot decompile value containing an unmatched }: ${JSON.stringify(value)}.`,
      );
    }

    const close = value.indexOf("}", open + 1);
    if (close === -1) {
      throw new Error(
        `Cannot decompile value containing an unclosed {: ${JSON.stringify(value)}.`,
      );
    }

    const raw = value.slice(open + 1, close).trim();
    if (!variablePattern.test(raw)) {
      throw new Error(
        `Cannot decompile value containing braces that are not a script variable: ${JSON.stringify(value)}.`,
      );
    }

    index = close + 1;
  }
}

function formatColor(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function joinScript(kind: "embed" | "cv2", parts: string[]): string {
  return `{${kind}} ${joinParts(parts)}`.trim();
}

function joinParts(parts: string[]): string {
  return parts.filter((part) => part.length > 0).join("$v");
}
