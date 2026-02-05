// packages/pdf/src/components/Typography.tsx
import React from 'react';
import { Text, StyleSheet } from '@react-pdf/renderer';

interface TypographyProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body';
  children: React.ReactNode;
}

export function Typography({ variant = 'body', children }: TypographyProps) {
  return <Text style={styles[variant]}>{children}</Text>;
}

// DSFR-compliant values (desktop/print sizes)
const styles = StyleSheet.create({
  h1: {
    fontSize: 40,        // 2.5rem (desktop)
    lineHeight: 48,      // 3rem
    fontWeight: 700,
    marginBottom: 24     // 1.5rem
  },
  h2: {
    fontSize: 32,        // 2rem
    lineHeight: 40,      // 2.5rem
    fontWeight: 700,
    marginBottom: 24
  },
  h3: {
    fontSize: 28,        // 1.75rem
    lineHeight: 36,      // 2.25rem
    fontWeight: 700,
    marginBottom: 24
  },
  h4: {
    fontSize: 24,        // 1.5rem
    lineHeight: 32,      // 2rem
    fontWeight: 700,
    marginBottom: 24
  },
  h5: {
    fontSize: 20,        // 1.25rem
    lineHeight: 28,      // 1.75rem
    fontWeight: 700,
    marginBottom: 24
  },
  h6: {
    fontSize: 18,        // 1.125rem
    lineHeight: 24,      // 1.5rem
    fontWeight: 700,
    marginBottom: 24
  },
  body: {
    fontSize: 16,        // 1rem
    lineHeight: 24,      // 1.5rem
    marginBottom: 24     // 1.5rem per DSFR spacing
  }
});
