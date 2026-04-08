import type { ReactNode } from 'react';

interface MapMockProps {
  children?: ReactNode;
}

function MapMock(props: Readonly<MapMockProps>) {
  return props.children;
}

export default MapMock;
