import { Link, LinkProps } from 'react-router-dom';
import React from 'react';
import classNames from 'classnames';
import {
  FrIconClassName,
  RiIconClassName,
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
  ...linkProps
}: AppLinkProps) {
  return (
    <Link
      {...linkProps}
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
