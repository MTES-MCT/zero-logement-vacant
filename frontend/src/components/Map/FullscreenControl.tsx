import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import { styled } from '@mui/material/styles';
import type { IControl, Map as MaplibreMap } from 'maplibre-gl';
import { createRoot, type Root } from 'react-dom/client';
import { useControl } from 'react-map-gl/maplibre';

const hex = fr.colors.getHex({ isDark: false });

// DSFR secondary buttons are transparent by default; force a white background
// so the control stays readable above the map tiles.
const StyledButton = styled(Button)({
  backgroundColor: hex.decisions.background.default.grey.default
});

export interface FullscreenMapButtonProps {
  isFullscreen: boolean;
  onToggle(): void;
}

export function FullscreenMapButton({
  isFullscreen,
  onToggle
}: Readonly<FullscreenMapButtonProps>) {
  const label = isFullscreen
    ? 'Quitter le plein écran'
    : 'Afficher la carte en plein écran';

  return (
    <StyledButton
      priority="secondary"
      size="small"
      iconId={
        isFullscreen
          ? 'ri-collapse-diagonal-2-line'
          : 'ri-expand-diagonal-2-line'
      }
      // `title` drives the mouse tooltip; `aria-label` duplicates it so the
      // accessible name is reliably exposed to touch/mobile screen readers,
      // where `title` alone is unreliable (RGAA 7.1/7.3).
      title={label}
      onClick={onToggle}
      nativeButtonProps={{ 'aria-label': label }}
    />
  );
}

/**
 * A MapLibre control that toggles the map container into fullscreen using the
 * native Fullscreen API, so the user can keep panning and zooming while the map
 * fills the whole screen.
 */
class Fullscreen implements IControl {
  private container: HTMLElement | null = null;
  private root: Root | null = null;
  private map: MaplibreMap | null = null;
  private isFullscreen = false;

  onAdd(map: MaplibreMap): HTMLElement {
    this.map = map;
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl';
    this.root = createRoot(this.container);
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    this.render();
    return this.container;
  }

  onRemove(): void {
    document.removeEventListener(
      'fullscreenchange',
      this.handleFullscreenChange
    );
    const root = this.root;
    setTimeout(() => root?.unmount(), 0);
    this.container?.remove();
    this.container = null;
    this.root = null;
    this.map = null;
  }

  private readonly handleFullscreenChange = (): void => {
    const target = this.map?.getContainer();
    this.isFullscreen = !!target && document.fullscreenElement === target;
    // The container changed size: let MapLibre recompute its dimensions.
    this.map?.resize();
    this.render();
  };

  private readonly toggle = (): void => {
    const target = this.map?.getContainer();
    if (!target) {
      return;
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void target.requestFullscreen();
    }
  };

  private render(): void {
    this.root?.render(
      <FullscreenMapButton
        isFullscreen={this.isFullscreen}
        onToggle={this.toggle}
      />
    );
  }
}

function FullscreenControl() {
  const control = new Fullscreen();
  useControl(() => control, {
    position: 'bottom-right'
  });
  return null;
}

export default FullscreenControl;
