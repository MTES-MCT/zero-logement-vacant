import { act, renderHook } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { Provider as StoreProvider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { genNumber } from '../../../test/fixtures.test';
import configureTestStore from '../../utils/test/storeUtils';

import { useSelection } from '../useSelection';

describe('useSelection', () => {
  const itemCount = Number(genNumber(3));

  function createWrapper() {
    const store = configureTestStore();

    // eslint-disable-next-line react/display-name
    return ({ children }: PropsWithChildren) => (
      <StoreProvider store={store}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={children} />
          </Routes>
        </MemoryRouter>
      </StoreProvider>
    );
  }

  it('should have a default state', () => {
    const { result } = renderHook(() => useSelection(itemCount), {
      wrapper: createWrapper()
    });

    expect(result.current.selected.ids).toHaveLength(0);
    expect(result.current.selected.all).toBe(false);
    expect(result.current.hasSelected).toBe(false);
  });

  it('should select and unselect one item', () => {
    const { result } = renderHook(() => useSelection(genNumber(3)), {
      wrapper: createWrapper()
    });

    act(() => {
      result.current.toggleSelect('123');
    });

    expect(result.current.selected).toStrictEqual({
      all: false,
      ids: ['123']
    });
    expect(result.current.isSelected('123')).toBe(true);
    expect(result.current.hasSelected).toBe(true);
    expect(result.current.selectedCount).toBe(1);

    act(() => {
      result.current.toggleSelect('123');
    });

    expect(result.current.selected).toStrictEqual({
      all: false,
      ids: []
    });
    expect(result.current.isSelected('123')).toBe(false);
    expect(result.current.hasSelected).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it('should select and unselect all items', () => {
    const { result } = renderHook(() => useSelection(itemCount), {
      wrapper: createWrapper()
    });

    act(() => {
      result.current.toggleSelectAll();
    });

    expect(result.current.selected).toStrictEqual({
      all: true,
      ids: []
    });
    expect(result.current.hasSelected).toBe(true);
    expect(result.current.selectedCount).toEqual(itemCount);

    act(() => {
      result.current.toggleSelectAll();
    });

    expect(result.current.selected).toStrictEqual({
      all: false,
      ids: []
    });
    expect(result.current.hasSelected).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it('should unselect all items only if all items are selected', () => {
    const { result } = renderHook(() => useSelection(itemCount), {
      wrapper: createWrapper()
    });

    act(() => {
      result.current.toggleSelect('123');
      result.current.toggleSelectAll();
    });

    expect(result.current.selected).toStrictEqual({
      all: true,
      ids: []
    });
    expect(result.current.hasSelected).toBe(true);
    expect(result.current.selectedCount).toBe(itemCount);

    act(() => {
      result.current.toggleSelectAll();
    });

    expect(result.current.selected).toStrictEqual({
      all: false,
      ids: []
    });
    expect(result.current.hasSelected).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it('should select all items and unselect one item', () => {
    const { result } = renderHook(() => useSelection(itemCount), {
      wrapper: createWrapper()
    });

    act(() => {
      result.current.toggleSelectAll();
    });
    act(() => {
      result.current.toggleSelect('123');
    });

    expect(result.current.selected).toStrictEqual({
      all: true,
      ids: ['123']
    });
    expect(result.current.isSelected('123')).toBe(false);
    expect(result.current.hasSelected).toBe(true);
    expect(result.current.selectedCount).toBe(itemCount - 1);
  });
});
