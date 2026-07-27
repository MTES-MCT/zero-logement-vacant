import { createContext, useContext, type ReactNode } from 'react';

export interface CanvasHandle {
  canvas: HTMLCanvasElement;
  toDataURL(): string | Promise<string>;
}

export interface CanvasFactory {
  createCanvas(width: number, height: number): CanvasHandle;
  loadImage(source: string): Promise<CanvasImageSource>;
}

const CanvasContext = createContext<CanvasFactory | null>(null);

export interface CanvasProviderProps {
  factory: CanvasFactory;
  children: ReactNode;
}

export function CanvasProvider({
  factory,
  children
}: Readonly<CanvasProviderProps>) {
  return (
    <CanvasContext.Provider value={factory}>{children}</CanvasContext.Provider>
  );
}

export function useCanvas(): CanvasFactory {
  const factory = useContext(CanvasContext);
  if (!factory) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return factory;
}
