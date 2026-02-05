import React from 'react';
import { View, StyleSheet } from '@react-pdf/renderer';

interface StackProps {
  direction?: 'row' | 'column';
  spacing?: number;
  children: React.ReactNode;
}

export function Stack({
  direction = 'column',
  spacing = 8,
  children
}: StackProps) {
  return (
    <View style={[
      styles[direction],
      { gap: spacing }
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  column: { flexDirection: 'column' }
});
