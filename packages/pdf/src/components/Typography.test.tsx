// packages/pdf/src/components/Typography.test.tsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { Text } from '@react-pdf/renderer';
import { Typography } from './Typography';

describe('Typography', () => {
  it('should render Text component with default body variant', () => {
    const result = Typography({ children: 'Test Text' });

    expect(result).toBeDefined();
    expect(result.type).toBe(Text);
    expect(result.props.children).toBe('Test Text');
  });

  it('should render Text component with h1 variant', () => {
    const result = Typography({ variant: 'h1', children: 'Heading' });

    expect(result).toBeDefined();
    expect(result.type).toBe(Text);
    expect(result.props.children).toBe('Heading');
    expect(result.props.style).toBeDefined();
  });

  it('should apply correct styles for each variant', () => {
    const variants = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body'] as const;

    variants.forEach((variant) => {
      const result = Typography({ variant, children: 'Test' });
      expect(result.props.style).toBeDefined();
      expect(result.props.style.fontSize).toBeGreaterThan(0);
      expect(result.props.style.lineHeight).toBeGreaterThan(0);
    });
  });

  it('should apply larger font size for h1 than body', () => {
    const h1Result = Typography({ variant: 'h1', children: 'Heading' });
    const bodyResult = Typography({ variant: 'body', children: 'Body' });

    expect(h1Result.props.style.fontSize).toBeGreaterThan(bodyResult.props.style.fontSize);
  });
});
