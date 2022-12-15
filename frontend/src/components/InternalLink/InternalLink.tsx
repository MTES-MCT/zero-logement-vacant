import { Link } from '@dataesr/react-dsfr';
import {
  Link as RouterLink,
  LinkProps as RouterLinkProps,
} from 'react-router-dom';
import { ComponentPropsWithoutRef } from 'react';

type LinkProps = ComponentPropsWithoutRef<typeof Link>;
type InternalLinkProps = Omit<LinkProps, 'href'> &
  Pick<RouterLinkProps, 'to' | 'replace'>;

function InternalLink(props: InternalLinkProps) {
  return (
    <Link
      {...props}
      as={<RouterLink to={props.to} replace={props.replace} />}
    />
  );
}

export default InternalLink;
