import type { Token } from "../../common/Token";
import type { ScriptValue } from "../../common/value/ValueNode";
import type {
  VariableContext,
  VariableResolver,
} from "../../common/value/resolveValue";
import type { ScriptError } from "../../common/ScriptError";
import type {
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  ThumbnailBuilder,
  ButtonBuilder,
  ActionRowBuilder,
} from "discord.js";

export interface Cv2Node {
  readonly kind: string;
  readonly token: Token;
}

export interface Cv2Script {
  readonly type: "cv2";

  readonly flat: Cv2Node[];

  readonly roots: Cv2Node[];
}

export type Cv2Child =
  | TextDisplayBuilder
  | SectionBuilder
  | SeparatorBuilder
  | MediaGalleryBuilder
  | ActionRowBuilder<ButtonBuilder>
  | ContainerBuilder;

export interface Cv2ValidationContext {
  errors: ScriptError[];
  addError(error: ScriptError): void;
}

export interface Cv2RenderContext {
  variables: VariableContext;
  resolver: VariableResolver;
}

export interface Cv2ComponentDefinition<T extends Cv2Node = Cv2Node> {
  readonly name: string;
  readonly aliases?: readonly string[];

  readonly structural?: boolean;
  create(token: Token, args: ScriptValue[]): T;
  validate(node: T, context: Cv2ValidationContext): void;
}

export type AnyCv2ComponentDefinition = Cv2ComponentDefinition<Cv2Node>;

export type Cv2Renderable =
  | ContainerBuilder
  | SectionBuilder
  | TextDisplayBuilder
  | SeparatorBuilder
  | MediaGalleryBuilder
  | ThumbnailBuilder
  | ButtonBuilder
  | ActionRowBuilder<ButtonBuilder>;
