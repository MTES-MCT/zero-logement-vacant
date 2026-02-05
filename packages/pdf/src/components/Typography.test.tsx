// packages/pdf/src/components/Typography.test.tsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { Typography } from './Typography';

describe('Typography', () => {
  it('should render with body variant by default', async () => {
    const instance = pdf(<Typography>Test Text</Typography>);
    const result = await instance.toBlob();

    expect(result).toBeInstanceOf(Blob);
    expect(result.size).toBeGreaterThan(0);
  });

  it('should render with h1 variant', async () => {
    const instance = pdf(<Typography variant="h1">Heading</Typography>);
    const result = await instance.toBlob();

    expect(result).toBeInstanceOf(Blob);
    expect(result.size).toBeGreaterThan(0);
  });
});
