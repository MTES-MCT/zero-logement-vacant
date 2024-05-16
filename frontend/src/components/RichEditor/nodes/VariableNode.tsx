import Badge from '@codegouvfr/react-dsfr/Badge';
import {
  DecoratorNode,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';

import { Variable } from '../Variable';
import { VariableOption } from '../../../../../shared';

interface VariableProps {
  children: string;
}

function VariableComponent(props: Readonly<VariableProps>) {
  return (
    <Badge as="span" noIcon severity="success">
      {props.children}
    </Badge>
  );
}

export type SerializedVariableNode = Spread<
  { variable: Variable },
  SerializedLexicalNode
>;

export class VariableNode extends DecoratorNode<JSX.Element> {
  static getType(): string {
    return 'variable';
  }

  static clone(node: VariableNode): VariableNode {
    return new VariableNode(node.variable, node.__key);
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (element: HTMLElement) => {
        if (!element.hasAttribute('data-variable-label')) {
          return null;
        }

        return {
          conversion: (element): DOMConversionOutput | null => {
            const label = element.getAttribute('data-variable-label');
            const value = element.textContent;
            if (!label || !value) {
              return null;
            }

            return {
              node: $createVariableNode({
                label,
                value: value as VariableOption,
              }),
            };
          },
          priority: 1,
        };
      },
    };
  }

  static importJSON(serializedNode: SerializedVariableNode): VariableNode {
    return $createVariableNode(serializedNode.variable);
  }

  constructor(
    private variable: Variable,
    key?: NodeKey,
  ) {
    super(key);
  }

  createDOM(): HTMLElement {
    return document.createElement('span');
  }

  updateDOM(): boolean {
    return false;
  }

  decorate(): JSX.Element {
    return <VariableComponent>{this.variable.label}</VariableComponent>;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('span');
    element.textContent = this.variable.value;
    element.setAttribute('data-variable-label', this.variable.label);

    return {
      element,
    };
  }

  exportJSON(): SerializedVariableNode {
    return {
      ...super.exportJSON(),
      type: 'variable',
      version: 1,
      variable: this.variable,
    };
  }
}

export function $createVariableNode(variable: Variable): VariableNode {
  return new VariableNode(variable);
}

export function $isVariableNode(
  node: LexicalNode | null | undefined,
): node is VariableNode {
  return node instanceof VariableNode;
}
