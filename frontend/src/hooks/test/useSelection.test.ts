import { act, renderHook } from '@testing-library/react';
import { useSelection } from '../useSelection';

describe('useSelection', () => {
  it('should have a default state', () => {
    const { result } = renderHook(() => useSelection());

    expect(result.current.selected.ids).toHaveLength(0);
    expect(result.current.selected.all).toBe(false);
    expect(result.current.hasSelected).toBe(false);
  });

  it('should select and unselect one item', () => {
    const { result } = renderHook(() => useSelection());

    act(() => {
      result.current.toggleSelect('123');
    });

    expect(result.current.selected).toStrictEqual({
      all: false,
      ids: ['123'],
    });
    expect(result.current.isSelected('123')).toBe(true);
    expect(result.current.hasSelected).toBe(true);

    act(() => {
      result.current.toggleSelect('123');
    });

    expect(result.current.selected).toStrictEqual({
      all: false,
      ids: [],
    });
    expect(result.current.isSelected('123')).toBe(false);
    expect(result.current.hasSelected).toBe(false);
  });

  it('should select and unselect all items', () => {
    const { result } = renderHook(() => useSelection());

    act(() => {
      result.current.toggleSelectAll();
    });

    expect(result.current.selected).toStrictEqual({
      all: true,
      ids: [],
    });
    expect(result.current.hasSelected).toBe(true);

    act(() => {
      result.current.toggleSelectAll();
    });

    expect(result.current.selected).toStrictEqual({
      all: false,
      ids: [],
    });
    expect(result.current.hasSelected).toBe(false);
  });

  it('should unselect all items only if all items are selected', () => {
    const { result } = renderHook(() => useSelection());

    act(() => {
      result.current.toggleSelect('123');
      result.current.toggleSelectAll();
    });

    expect(result.current.selected).toStrictEqual({
      all: true,
      ids: [],
    });
    expect(result.current.hasSelected).toBe(true);

    act(() => {
      result.current.toggleSelectAll();
    });

    expect(result.current.selected).toStrictEqual({
      all: false,
      ids: [],
    });
    expect(result.current.hasSelected).toBe(false);
  });

  it('should select all items and unselect one item', () => {
    const { result } = renderHook(() => useSelection());

    act(() => {
      result.current.toggleSelectAll();
      result.current.toggleSelect('123');
    });

    expect(result.current.selected).toStrictEqual({
      all: true,
      ids: ['123'],
    });
    expect(result.current.isSelected('123')).toBe(false);
  });
});
