import {
  MessageFlags,
  type APIEmbed,
  type APIMessageTopLevelComponent,
} from "discord.js";

import { isScriptError } from "./common/ScriptError";
import { compileCv2Script } from "./cv2";
import { detectScriptKind, mergeMessageContent } from "./detectScriptKind";
import { MESSAGE_CONTENT_LIMIT } from "./embed/ast/nodes/ContentNode";
import { compileEmbedScript, compileMultiEmbedScripts } from "./embed";

const MAX_EMBEDS = 10;
const MAX_ACTION_ROWS = 5;

export type ScriptMessageKind = "text" | "embed" | "multi-embed" | "cv2";

export interface ScriptMessageBody {
  content?: string;
  embeds?: APIEmbed[];
  components?: APIMessageTopLevelComponent[];
  flags?: MessageFlags.IsComponentsV2;
}

export interface ScriptMessage {
  kind: ScriptMessageKind;
  body: ScriptMessageBody;
  deleteMs?: number;
}

export type BuildScriptMessageResult =
  { success: true; message: ScriptMessage } | { success: false; error: string };

function fail(error: string): BuildScriptMessageResult {
  return { success: false, error };
}

function contentTooLong(content: string | undefined): string | null {
  if (content && content.length > MESSAGE_CONTENT_LIMIT) {
    return `Message content cannot exceed ${MESSAGE_CONTENT_LIMIT} characters (got ${content.length}).`;
  }

  return null;
}

export function buildScriptMessage(script: string): BuildScriptMessageResult {
  let detected;

  try {
    detected = detectScriptKind(script);
  } catch (error) {
    if (isScriptError(error)) {
      return fail(`Invalid script: ${error.message}`);
    }

    throw error;
  }

  if (detected.kind === "text") {
    if (!detected.source.trim()) return fail("Empty message.");

    const tooLong = contentTooLong(detected.source);
    if (tooLong) return fail(tooLong);

    return {
      success: true,
      message: {
        kind: "text",
        body: { content: detected.source },
        deleteMs: detected.deleteMs,
      },
    };
  }

  if (detected.kind === "cv2") {
    if (!detected.source) return fail("Missing cv2 script.");

    const compiled = compileCv2Script(detected.source, {
      prependText: detected.content,
    });

    if (!compiled.success) {
      return fail(`Invalid script: ${compiled.error.message}`);
    }

    return {
      success: true,
      message: {
        kind: "cv2",
        body: {
          flags: MessageFlags.IsComponentsV2,
          components: compiled.result.components,
        },
        deleteMs: compiled.result.deleteMs ?? detected.deleteMs,
      },
    };
  }

  if (!detected.source) return fail("Missing embed script.");

  if (detected.kind === "multi-embed") {
    const compiled = compileMultiEmbedScripts(detected.source);

    if (!compiled.success) {
      return fail(`Invalid script: ${compiled.error.message}`);
    }

    const embeds = compiled.result.embeds.map(({ embed }) => embed);
    const components = compiled.result.embeds.flatMap(
      ({ components }) => components,
    );

    if (embeds.length > MAX_EMBEDS) {
      return fail(`Messages can have at most ${MAX_EMBEDS} embeds.`);
    }

    if (components.length > MAX_ACTION_ROWS) {
      return fail(
        `Messages can have at most ${MAX_ACTION_ROWS} rows of buttons (${MAX_ACTION_ROWS * 5} buttons).`,
      );
    }

    const content = mergeMessageContent(
      detected.content,
      compiled.result.content,
    );

    const tooLong = contentTooLong(content);
    if (tooLong) return fail(tooLong);

    return {
      success: true,
      message: {
        kind: "multi-embed",
        body: {
          ...(content ? { content } : {}),
          embeds,
          ...(components.length > 0 ? { components } : {}),
        },
        deleteMs: compiled.result.deleteMs ?? detected.deleteMs,
      },
    };
  }

  const compiled = compileEmbedScript(detected.source);

  if (!compiled.success) {
    return fail(`Invalid script: ${compiled.error.message}`);
  }

  const content = mergeMessageContent(
    detected.content,
    compiled.result.content,
  );

  const tooLong = contentTooLong(content);
  if (tooLong) return fail(tooLong);

  return {
    success: true,
    message: {
      kind: "embed",
      body: {
        ...(content ? { content } : {}),
        embeds: [compiled.result.embed],
        ...(compiled.result.components.length > 0
          ? { components: compiled.result.components }
          : {}),
      },
      deleteMs: compiled.result.deleteMs ?? detected.deleteMs,
    },
  };
}
