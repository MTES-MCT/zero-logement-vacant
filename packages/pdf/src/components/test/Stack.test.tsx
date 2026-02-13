import { View } from '@react-pdf/renderer';
import { describe, expect, it } from 'vitest';

import { Stack } from '../Stack.js';

describe('Stack', () => {
  it('should render with column direction by default', () => {
    const actual = Stack({ children: <View>Item</View> });

    expect(actual).toBeDefined();
    expect(actual.type).toBe(View);
    expect(actual.props.style).toContainEqual({ flexDirection: 'column' });
  });

  it('should render with row direction', () => {
    const actual = Stack({ direction: 'row', children: <View>Item</View> });

    expect(actual).toBeDefined();
    expect(actual.props.style).toContainEqual({ flexDirection: 'row' });
  });

  it('should apply custom spacing', () => {
    const actual = Stack({ spacing: 16, children: <View>Item</View> });

    expect(actual.props.style).toContainEqual({ gap: 16 });
  });
});
