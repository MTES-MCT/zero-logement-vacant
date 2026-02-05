// packages/pdf/src/components/Typography.test.tsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { Typography } from './Typography';

describe('Typography', () => {
  it('should render with body variant by default', () => {
    const element = <Typography>Test Text</Typography>;

    expect(element.type).toBe(Typography);
    expect(element.props.children).toBe('Test Text');
    expect(element.props.variant).toBeUndefined();
  });

  it('should render with h1 variant', () => {
    const element = <Typography variant="h1">Heading</Typography>;

    expect(element.type).toBe(Typography);
    expect(element.props.variant).toBe('h1');
    expect(element.props.children).toBe('Heading');
  });

  it('should render with h2 variant', () => {
    const element = <Typography variant="h2">Heading 2</Typography>;

    expect(element.type).toBe(Typography);
    expect(element.props.variant).toBe('h2');
    expect(element.props.children).toBe('Heading 2');
  });

  it('should render with h3 variant', () => {
    const element = <Typography variant="h3">Heading 3</Typography>;

    expect(element.type).toBe(Typography);
    expect(element.props.variant).toBe('h3');
  });

  it('should render with h4 variant', () => {
    const element = <Typography variant="h4">Heading 4</Typography>;

    expect(element.type).toBe(Typography);
    expect(element.props.variant).toBe('h4');
  });

  it('should render with h5 variant', () => {
    const element = <Typography variant="h5">Heading 5</Typography>;

    expect(element.type).toBe(Typography);
    expect(element.props.variant).toBe('h5');
  });

  it('should render with h6 variant', () => {
    const element = <Typography variant="h6">Heading 6</Typography>;

    expect(element.type).toBe(Typography);
    expect(element.props.variant).toBe('h6');
  });

  it('should render with body variant explicitly', () => {
    const element = <Typography variant="body">Body text</Typography>;

    expect(element.type).toBe(Typography);
    expect(element.props.variant).toBe('body');
    expect(element.props.children).toBe('Body text');
  });

  it('should accept React nodes as children', () => {
    const element = <Typography variant="h1">
      <React.Fragment>Complex content</React.Fragment>
    </Typography>;

    expect(element.type).toBe(Typography);
    expect(element.props.children).toBeDefined();
  });
});
