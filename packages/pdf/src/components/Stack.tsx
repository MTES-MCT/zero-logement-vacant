import { StyleSheet, View, type ViewProps } from '@react-pdf/renderer';
import React from 'react';
import { match, Pattern } from 'ts-pattern';

interface StackProps {
  children: React.ReactNode;
  direction: 'row' | 'column';
  spacing?: number | string;
  style?: ViewProps['style'];
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row'
  },
  column: {
    flexDirection: 'column'
  }
});

export function Stack(props: Readonly<StackProps>) {
  const direction = match(props.direction)
    .with('row', () => styles.row)
    .with('column', () => styles.column)
    .exhaustive();

  const additionalStyle = match(props.style)
    .with(undefined, () => [])
    .with(Pattern.array(Pattern.any), (style) => style)
    .with(Pattern.any, (style) => [style])
    .exhaustive();

  return <View style={[direction, ...additionalStyle]}>{props.children}</View>;
}
