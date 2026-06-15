import { StyleSheet, View, type ViewProps } from '@react-pdf/renderer';
import { type ReactNode } from 'react';
import { match, Pattern } from 'ts-pattern';

interface StackProps extends ViewProps {
  children: ReactNode;
  /**
   * @default 'column'
   */
  direction?: 'row' | 'column';
  spacing?: string | number;
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
  const direction = match(props.direction ?? 'column')
    .with('row', () => styles.row)
    .with('column', () => styles.column)
    .exhaustive();

  const gap = { gap: props.spacing };

  const additionalStyle = match(props.style)
    .with(undefined, () => [])
    .with(Pattern.array(Pattern.any), (style) => style)
    .with(Pattern.any, (style) => [style])
    .exhaustive();

  return (
    <View style={[direction, gap, ...additionalStyle]}>{props.children}</View>
  );
}
