import { StyleSheet, Text, type TextProps } from '@react-pdf/renderer';
import React from 'react';
import { match, Pattern } from 'ts-pattern';

export interface TypographyProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body';
  children: React.ReactNode;
}

export function Typography(props: Readonly<TypographyProps>) {
  const variant = match(props.variant)
    .with('h1', () => styles.h1)
    .with('h2', () => styles.h2)
    .with('h3', () => styles.h3)
    .with('h4', () => styles.h4)
    .with('h5', () => styles.h5)
    .with('h6', () => styles.h6)
    .with('body', undefined, () => styles.body)
    .exhaustive();

  const additionalStyle = match(props.style)
    .with(undefined, () => [])
    .with(Pattern.array(Pattern.any), (style) => style)
    .with(Pattern.any, (style) => [style])
    .exhaustive();

  return <Text style={[variant, ...additionalStyle]}>{props.children}</Text>;
}

// DSFR-compliant values (desktop/print sizes)
const styles = StyleSheet.create({
  h1: {
    fontSize: '2.5rem',
    lineHeight: '3rem',
    fontWeight: 700
  },
  h2: {
    fontSize: '2rem',
    lineHeight: '2.5rem',
    fontWeight: 700
  },
  h3: {
    fontSize: '1.75rem',
    lineHeight: '2.25rem',
    fontWeight: 700
  },
  h4: {
    fontSize: '1.5rem',
    lineHeight: '2rem',
    fontWeight: 700
  },
  h5: {
    fontSize: '1.25rem',
    lineHeight: '1.75rem',
    fontWeight: 700
  },
  h6: {
    fontSize: '1.125rem',
    lineHeight: '1.5rem',
    fontWeight: 700
  },
  body: {
    fontSize: '1rem',
    lineHeight: '1.5rem'
  }
});
