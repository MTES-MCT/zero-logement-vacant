import { PropsWithChildren } from 'react';

interface Props {
  title: string;
  /**
   * Return true to go to the next step, false otherwise.
   */
  onConfirm?: () => Promise<boolean> | boolean;
}

function ModalStep(props: PropsWithChildren<Props>) {
  const id = `step-${props.title.toLowerCase().replace(/ /g, '-')}`;
  return <article id={id}>{props.children}</article>;
}

export default ModalStep;
