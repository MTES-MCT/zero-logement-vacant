import { Link, LinkProps } from 'react-router-dom';
import classNames from 'classnames';
import {
  FrIconClassName,
  RiIconClassName
} from '@codegouvfr/react-dsfr/src/fr/generatedFromCss/classNames';

export type AppLinkProps = LinkProps & {
  isSimple?: boolean;
  iconId?: FrIconClassName | RiIconClassName;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
};

function AppLink({
  className,
  size,
  isSimple,
  iconId,
  iconPosition,
  to,
  ...linkProps
}: AppLinkProps) {
  return (
    <Link
      {...linkProps}
      to={
        typeof to === 'string' &&
        (to.startsWith('http') || to.startsWith('mailto'))
          ? { pathname: to, }
          : to
      }
      className={classNames(
        className,
        {
          'fr-link': isSimple,
          [`fr-link--${size}`]: size,
          [`fr-link--icon-${iconPosition}`]: iconId
            ? iconPosition ?? 'left'
            : undefined,
        },
        iconId
      )}
    />
  );
}

export default AppLink;
