import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock heavy map dependencies that require WebGL or native bindings
vi.mock('react-map-gl/maplibre', () => ({
  default: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  useMap: () => ({ housingMap: null }),
  NavigationControl: () => null,
  useControl: vi.fn(),
  Source: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Layer: () => null,
  Popup: ({ children }: { children?: React.ReactNode }) => <>{children}</>
}));
vi.mock('carte-facile', () => ({
  mapStyles: { simple: 'simple' },
  MapSelectorControl: class {
    onRemove() {}
  }
}));
vi.mock('@turf/turf', () => ({
  point: vi.fn(),
  bbox: vi.fn(() => [0, 0, 0, 0]),
  featureCollection: vi.fn()
}));
vi.mock('~/hooks/useMapImage', () => ({ useMapImage: vi.fn() }));
vi.mock('~/hooks/useUser', () => ({
  useUser: () => ({ isVisitor: false })
}));

// Unmock Map.tsx so we test the real implementation (globally mocked in vitest.setup.ts)
vi.unmock('../Map');

import Map from '../Map';
import configureTestStore from '~/utils/storeUtils';

describe('Map legend', () => {
  const user = userEvent.setup();

  function renderComponent() {
    const store = configureTestStore();
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Map />
        </MemoryRouter>
      </Provider>
    );
  }

  it('should show the legend button', () => {
    renderComponent();

    expect(
      screen.getByRole('button', { name: /légende/i })
    ).toBeInTheDocument();
  });

  it('should open the legend panel when the legend button is clicked', async () => {
    renderComponent();

    await user.click(screen.getByRole('button', { name: /légende/i }));

    expect(screen.getByText('Localisation')).toBeInTheDocument();
    expect(screen.getByText('Suivi')).toBeInTheDocument();
  });

  it('should close the legend panel when the close button is clicked', async () => {
    renderComponent();

    await user.click(screen.getByRole('button', { name: /légende/i }));
    await user.click(screen.getByRole('button', { name: /fermer/i }));

    expect(screen.queryByText('Localisation')).not.toBeInTheDocument();
  });
});
