import type {
  Guild,
  GuildMember,
  Message,
  MessageCreateOptions,
  MessagePayload,
  PartialGuildMember,
  User,
} from "discord.js";
import { MessageFlags } from "discord.js";

import type Client from "@/classes/client";
import { compileCv2Script } from "@/libs/scripting/cv2";
import { detectScriptKind } from "@/libs/scripting/detectScriptKind";
import {
  compileEmbedScript,
  compileMultiEmbedScripts,
} from "@/libs/scripting/embed";
import { isScriptError } from "@/libs/scripting/common/ScriptError";
import { scheduleMessageDeletion } from "@/libs/scripting/scheduleMessageDeletion";
import { replaceVariables } from "@/libs/scripting/variables";

export type LeaveSendableChannel = {
  send: (
    options: string | MessagePayload | MessageCreateOptions,
  ) => Promise<Message>;
};

export type LeaveFailure =
  | { kind: "detect_error"; error: unknown }
  | { kind: "missing_embed_source" }
  | { kind: "missing_cv2_source" }
  | { kind: "embed_compile_error"; error: unknown }
  | { kind: "cv2_compile_error"; error: unknown };

export type LeaveResult =
  { success: true } | { success: false; failure: LeaveFailure };

export type LeaveVariables = {
  user: User;
  guild: Guild;
  member: GuildMember | PartialGuildMember;
};

export function validateLeaveMessage(rawMessage: string): LeaveResult {
  let detected;

  try {
    detected = detectScriptKind(rawMessage);
  } catch (error) {
    return {
      success: false,
      failure: {
        kind: "detect_error",
        error,
      },
    };
  }

  if (detected.kind === "text") {
    return { success: true };
  }

  if (detected.kind === "embed") {
    if (!detected.source) {
      return {
        success: false,
        failure: {
          kind: "missing_embed_source",
        },
      };
    }

    const compiled = compileEmbedScript(detected.source);

    if (!compiled.success) {
      return {
        success: false,
        failure: {
          kind: "embed_compile_error",
          error: compiled.error,
        },
      };
    }

    return { success: true };
  }

  if (detected.kind === "multi-embed") {
    if (!detected.source) {
      return {
        success: false,
        failure: {
          kind: "missing_embed_source",
        },
      };
    }

    const compiled = compileMultiEmbedScripts(detected.source);

    if (!compiled.success) {
      return {
        success: false,
        failure: {
          kind: "embed_compile_error",
          error: compiled.error,
        },
      };
    }

    return { success: true };
  }

  if (!detected.source) {
    return {
      success: false,
      failure: {
        kind: "missing_cv2_source",
      },
    };
  }

  const compiled = compileCv2Script(detected.source);

  if (!compiled.success) {
    return {
      success: false,
      failure: {
        kind: "cv2_compile_error",
        error: compiled.error,
      },
    };
  }

  return { success: true };
}

export async function deliverLeaveMessage(
  channel: LeaveSendableChannel,
  rawMessage: string,
  variables: LeaveVariables,
): Promise<LeaveResult> {
  const source = replaceVariables(rawMessage, variables);

  let detected;

  try {
    detected = detectScriptKind(source);
  } catch (error) {
    return {
      success: false,
      failure: {
        kind: "detect_error",
        error,
      },
    };
  }

  if (detected.kind === "text") {
    const sent = await channel.send(detected.source);

    scheduleMessageDeletion(sent, detected.deleteMs);

    return { success: true };
  }

  if (detected.kind === "embed") {
    if (!detected.source) {
      return {
        success: false,
        failure: {
          kind: "missing_embed_source",
        },
      };
    }

    const compiled = compileEmbedScript(detected.source);

    if (!compiled.success) {
      return {
        success: false,
        failure: {
          kind: "embed_compile_error",
          error: compiled.error,
        },
      };
    }

    const deleteMs = compiled.result.deleteMs ?? detected.deleteMs;

    const sent = await channel.send({
      ...(compiled.result.content ? { content: compiled.result.content } : {}),
      embeds: [compiled.result.embed],
      ...(compiled.result.components.length > 0
        ? { components: compiled.result.components }
        : {}),
    });

    scheduleMessageDeletion(sent, deleteMs);

    return { success: true };
  }

  if (detected.kind === "multi-embed") {
    if (!detected.source) {
      return {
        success: false,
        failure: {
          kind: "missing_embed_source",
        },
      };
    }

    const compiled = compileMultiEmbedScripts(detected.source);

    if (!compiled.success) {
      return {
        success: false,
        failure: {
          kind: "embed_compile_error",
          error: compiled.error,
        },
      };
    }

    const deleteMs = compiled.result.deleteMs ?? detected.deleteMs;

    const allComponents: (typeof compiled.result.embeds)[number]["components"] =
      [];
    const embeds = compiled.result.embeds.map((e) => {
      allComponents.push(...e.components);
      return e.embed;
    });

    const sent = await channel.send({
      ...(compiled.result.content ? { content: compiled.result.content } : {}),
      embeds,
      ...(allComponents.length > 0 ? { components: allComponents } : {}),
    });

    scheduleMessageDeletion(sent, deleteMs);
    return { success: true };
  }

  if (!detected.source) {
    return {
      success: false,
      failure: {
        kind: "missing_cv2_source",
      },
    };
  }

  const compiled = compileCv2Script(detected.source);

  if (!compiled.success) {
    return {
      success: false,
      failure: {
        kind: "cv2_compile_error",
        error: compiled.error,
      },
    };
  }

  const deleteMs = compiled.result.deleteMs ?? detected.deleteMs;

  const sent = await channel.send({
    flags: MessageFlags.IsComponentsV2,
    components: compiled.result.components,
  });

  scheduleMessageDeletion(sent, deleteMs);

  return { success: true };
}

export function leaveFailureMessage(
  client: Client,
  failure: LeaveFailure,
): string {
  switch (failure.kind) {
    case "detect_error":
      return isScriptError(failure.error)
        ? failure.error.message
        : client.i18n.t("commands.leave.invalid_script");

    case "missing_embed_source":
      return client.i18n.t("commands.builder.missing_embed");

    case "missing_cv2_source":
      return client.i18n.t("commands.builder.missing_cv2");

    case "embed_compile_error":
      return isScriptError(failure.error)
        ? failure.error.message
        : client.i18n.t("commands.leave.invalid_embed");

    case "cv2_compile_error":
      return isScriptError(failure.error)
        ? failure.error.message
        : client.i18n.t("commands.leave.invalid_cv2");
  }
}

export function leaveFailureLogReason(failure: LeaveFailure): string {
  return failure.kind;
}
