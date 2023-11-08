import { PropsWithChildren } from 'react';

interface Props {
  title: string;
  onConfirm?: () => Promise<void> | void;
}

function ModalStep(props: PropsWithChildren<Props>) {
  const id = `step-${props.title.toLowerCase().replace(/ /g, '-')}`;
  return <article id={id}>{props.children}</article>;
}

export default ModalStep;
