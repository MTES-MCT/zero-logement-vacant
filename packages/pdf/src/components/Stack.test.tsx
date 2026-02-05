import { describe, it, expect } from 'vitest';
import React from 'react';
import { View } from '@react-pdf/renderer';
import { Stack } from './Stack';

describe('Stack', () => {
  it('should render with column direction by default', () => {
    const result = Stack({ children: <View>Item</View> });

    expect(result).toBeDefined();
    expect(result.type).toBe(View);
    expect(result.props.style).toContainEqual({ flexDirection: 'column' });
  });

  it('should render with row direction', () => {
    const result = Stack({ direction: 'row', children: <View>Item</View> });

    expect(result).toBeDefined();
    expect(result.props.style).toContainEqual({ flexDirection: 'row' });
  });

  it('should apply custom spacing', () => {
    const result = Stack({ spacing: 16, children: <View>Item</View> });

    expect(result.props.style).toContainEqual({ gap: 16 });
  });
});
