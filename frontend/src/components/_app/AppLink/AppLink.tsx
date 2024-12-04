import { FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';
import classNames from 'classnames';
import { Link, LinkProps, Path, To } from 'react-router-dom';

export type AppLinkProps = LinkProps & {
  isSimple?: boolean;
  iconId?: FrIconClassName | RiIconClassName;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
};

function AppLink({
  size,
  isSimple,
  iconId,
  iconPosition,
  to,
  ...linkProps
}: AppLinkProps) {
  const className = classNames(linkProps.className, {
    'fr-link': isSimple,
    [`fr-link--${size}`]: size,
    [`fr-link--icon-${iconPosition}`]: iconId
      ? (iconPosition ?? 'left')
      : undefined
  });

  if (
    (typeof to === 'string' && isExternalLink(to)) ||
    (isPartialPath(to) && to.pathname && isExternalLink(to.pathname))
  ) {
    return (
      <a
        {...linkProps}
        className={className}
        href={typeof to === 'string' ? to : to.pathname}
        rel="noopener noreferrer"
      />
    );
  }

  return <Link {...linkProps} className={className} to={to} />;
}

function isPartialPath(link: To): link is Partial<Path> {
  return typeof link === 'object' && 'pathname' in link;
}

function isExternalLink(link: string): boolean {
  return link.startsWith('http') || link.startsWith('mailto');
}

export default AppLink;
