import Badge from '@codegouvfr/react-dsfr/Badge';
import {
  DecoratorNode,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
} from 'lexical';

import { Variable } from '../Variable';

interface VariableProps {
  children: string;
}

function VariableComponent(props: VariableProps) {
  return (
    <Badge as="span" noIcon severity="success">
      {props.children}
    </Badge>
  );
}

export class VariableNode extends DecoratorNode<JSX.Element> {
  static getType(): string {
    return 'variable';
  }

  static clone(node: VariableNode): VariableNode {
    return new VariableNode(node.variable, node.__key);
  }

  constructor(private variable: Variable, key?: NodeKey) {
    super(key);
  }

  createDOM(): HTMLElement {
    return document.createElement('span');
  }

  updateDOM(): boolean {
    return false;
  }

  decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
    return <VariableComponent>{this.variable.label}</VariableComponent>;
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = document.createElement('span');
    element.textContent = this.variable.value;

    return {
      element,
    };
  }
}

export function $createVariableNode(variable: Variable): VariableNode {
  return new VariableNode(variable);
}

export function $isVariableNode(
  node: LexicalNode | null | undefined
): node is VariableNode {
  return node instanceof VariableNode;
}
