import { Children, JSXElementConstructor, ReactElement } from "react";

export function findChild(children: ReactElement | ReactElement[] | undefined, type: string | JSXElementConstructor<any>): ReactElement | undefined {
  return Children
    .toArray(children)
    .find(child => (child as ReactElement).type === type) as ReactElement | undefined
}
