import type { ButtonBuilder, EmbedBuilder } from "discord.js";
import type { Token } from "../../common/Token";
import type { ScriptValue } from "../../common/value/ValueNode";
import type {
  VariableContext,
  VariableResolver,
} from "../../common/value/resolveValue";
import type { EmbedNode } from "../ast/EmbedNode";
import type { ScriptError } from "../../common/ScriptError";

export interface EmbedValidationContext {
  fieldCount: number;
  buttonCount: number;
  hasDelete?: boolean;
  errors: ScriptError[];
  addError(error: ScriptError): void;
}

export interface EmbedRenderContext {
  variables: VariableContext;
  resolver: VariableResolver;
}

export interface EmbedRenderTarget {
  embed: EmbedBuilder;
  buttons: ButtonBuilder[];
  content?: string;
  deleteMs?: number;
}

export interface EmbedParameterDefinition<T extends EmbedNode = EmbedNode> {
  readonly name: string;
  readonly aliases?: readonly string[];
  create(token: Token, args: ScriptValue[]): T;
  validate(node: T, context: EmbedValidationContext): void;
  render(node: T, target: EmbedRenderTarget, context: EmbedRenderContext): void;
}

export type AnyEmbedParameterDefinition = EmbedParameterDefinition<EmbedNode>;
