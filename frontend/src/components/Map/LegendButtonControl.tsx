import Button from '@codegouvfr/react-dsfr/Button';
import type { IControl } from 'maplibre-gl';
import { createRoot, type Root } from 'react-dom/client';
import { useControl } from 'react-map-gl/maplibre';

class LegendControl implements IControl {
  private container: HTMLElement | null = null;
  private root: Root | null = null;
  private readonly onOpen: () => void;

  constructor(onOpen: () => void) {
    this.onOpen = onOpen;
  }

  onAdd(): HTMLElement {
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    this.root = createRoot(this.container);
    this.root.render(
      <Button priority="secondary" size="small" onClick={this.onOpen}>
        Légende
      </Button>
    );
    return this.container;
  }

  onRemove(): void {
    setTimeout(() => this.root?.unmount(), 0);
    this.container?.remove();
    this.container = null;
  }
}

export interface LegendButtonControlProps {
  onOpen(): void;
}

function LegendButtonControl({ onOpen }: Readonly<LegendButtonControlProps>) {
  const control = new LegendControl(onOpen);
  useControl(
    () => control,
    () => control.onAdd(),
    () => control.onRemove(),
    {
      position: 'bottom-left'
    }
  );
  return null;
}

export default LegendButtonControl;
