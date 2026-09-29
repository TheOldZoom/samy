import type { Token } from "../../common/Token";
import type { ScriptValue } from "../../common/value/ValueNode";
import type {
  VariableContext,
  VariableResolver,
} from "../../common/value/resolveValue";
import type { ScriptError } from "../../common/ScriptError";
import type { ButtonBuilder } from "discord.js";
import type {
  ActionRowComponent,
  Container,
  MediaGallery,
  SectionComponent,
  SeparatorComponent,
  TextDisplay,
  ThumbnailComponent,
} from "@/utils/ui/components";

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
  | TextDisplay
  | SectionComponent
  | SeparatorComponent
  | MediaGallery
  | ActionRowComponent
  | Container;

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
  | Container
  | SectionComponent
  | TextDisplay
  | SeparatorComponent
  | MediaGallery
  | ThumbnailComponent
  | ButtonBuilder
  | ActionRowComponent;
