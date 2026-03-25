import Button from '@codegouvfr/react-dsfr/Button';
import type { IControl } from 'maplibre-gl';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useControl } from 'react-map-gl/maplibre';

class LegendControl implements IControl {
  private container: HTMLElement | null = null;
  private root: Root | null = null;

  constructor(private readonly onOpen: () => void) {}

  onAdd(): HTMLElement {
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    this.root = createRoot(this.container);
    this.root.render(
      React.createElement(
        Button,
        {
          priority: 'secondary',
          size: 'small',
          onClick: this.onOpen
        },
        'Légende'
      )
    );
    return this.container;
  }

  onRemove(): void {
    setTimeout(() => this.root?.unmount(), 0);
    this.container?.remove();
    this.container = null;
  }
}

interface Props {
  onOpen: () => void;
}

function LegendButtonControl({ onOpen }: Readonly<Props>) {
  useControl(() => new LegendControl(onOpen), { position: 'bottom-left' });
  return null;
}

export default LegendButtonControl;
