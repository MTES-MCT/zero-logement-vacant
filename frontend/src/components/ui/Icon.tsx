import {
  fr,
  type FrIconClassName,
  type RiIconClassName
} from '@codegouvfr/react-dsfr';
import Box from '@mui/material/Box';
import classNames from 'classnames';

export interface IconProps {
  name: FrIconClassName | RiIconClassName;
  /**
   * @default 'md'
   */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

function Icon(props: Readonly<IconProps>) {
  const size = props.size ?? 'md';
  const color = props.color ?? fr.colors.decisions.text.default.grey.default;

  return (
    <Box
      component="span"
      className={classNames(
        props.className,
        fr.cx(props.name, `fr-icon--${size}`)
      )}
      sx={{ color }}
      aria-hidden={true}
    />
  );
}

export default Icon;
