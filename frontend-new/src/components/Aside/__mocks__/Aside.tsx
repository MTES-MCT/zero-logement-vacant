import { ComponentPropsWithoutRef } from 'react';

const { default: Aside } =
  jest.requireActual<typeof import('../Aside')>('../Aside');

type AsideProps = ComponentPropsWithoutRef<typeof Aside>;
type MockAsideProps = Omit<AsideProps, 'attachTo'>;

function AsideMock(props: MockAsideProps) {
  const body = document.querySelector('body');
  if (!body) {
    throw new Error('Missing <body> element');
  }

  return <Aside {...props} attachTo={body} />;
}

export default AsideMock;
