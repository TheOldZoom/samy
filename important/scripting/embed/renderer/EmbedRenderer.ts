import { ActionRowBuilder, EmbedBuilder, type ButtonBuilder } from "discord.js";
import {
  passthroughVariableResolver,
  type VariableContext,
  type VariableResolver,
} from "../../common/value/resolveValue";
import type { EmbedScript } from "../ast/EmbedNode";
import { getEmbedParameter } from "../registry";
import type {
  EmbedRenderContext,
  EmbedRenderTarget,
} from "../types/ParameterDefinition";
import { EMBED_LIMITS } from "../../common/limits";

export interface EmbedRenderResult {
  embed: EmbedBuilder;
  components: ActionRowBuilder<ButtonBuilder>[];
  content?: string;
  deleteMs?: number;
}

export interface MultiEmbedRenderResult {
  embeds: EmbedRenderResult[];
  content?: string;
  deleteMs?: number;
}

export interface EmbedRenderOptions {
  variables?: VariableContext;
  resolver?: VariableResolver;
}

export class EmbedRenderer {
  render(
    script: EmbedScript,
    options: EmbedRenderOptions = {},
  ): EmbedRenderResult {
    const target: EmbedRenderTarget = {
      embed: new EmbedBuilder(),
      buttons: [],
    };

    const context: EmbedRenderContext = {
      variables: options.variables ?? {},
      resolver: options.resolver ?? passthroughVariableResolver,
    };

    for (const node of script.nodes) {
      const definition = getEmbedParameter(node.kind);
      if (!definition) continue;
      definition.render(node, target, context);
    }

    return {
      embed: target.embed,
      components: chunkButtons(target.buttons),
      content: target.content,
      deleteMs: target.deleteMs,
    };
  }

  renderMultiple(
    scripts: EmbedScript[],
    options: EmbedRenderOptions = {},
  ): MultiEmbedRenderResult {
    let globalContent: string | undefined;
    let globalDeleteMs: number | undefined;

    const embeds = scripts.map((script) => {
      const result = this.render(script, options);
      if (result.content) {
        globalContent = result.content;
      }
      if (result.deleteMs) {
        globalDeleteMs = result.deleteMs;
      }
      return result;
    });

    return {
      embeds,
      content: globalContent,
      deleteMs: globalDeleteMs,
    };
  }
}

function chunkButtons(
  buttons: ButtonBuilder[],
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  for (let i = 0; i < buttons.length; i += EMBED_LIMITS.buttonsPerRow) {
    const slice = buttons.slice(i, i + EMBED_LIMITS.buttonsPerRow);
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(slice));
  }

  return rows;
}

export function renderEmbedScript(
  script: EmbedScript,
  options?: EmbedRenderOptions,
): EmbedRenderResult {
  return new EmbedRenderer().render(script, options);
}

export function renderMultiEmbedScripts(
  scripts: EmbedScript[],
  options?: EmbedRenderOptions,
): MultiEmbedRenderResult {
  return new EmbedRenderer().renderMultiple(scripts, options);
}
