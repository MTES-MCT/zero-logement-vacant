import Badge, { type BadgeProps } from '@codegouvfr/react-dsfr/Badge';

export interface DoNotContactBadgeProps {
  doNotContact: boolean | null;
  badgeProps?: BadgeProps;
}

/**
 * Owner-level "do not contact" badge. Rendered wherever an owner is shown when
 * they refused to be contacted; renders nothing otherwise.
 */
function DoNotContactBadge(props: Readonly<DoNotContactBadgeProps>) {
  if (!props.doNotContact) {
    return null;
  }

  return (
    <Badge severity="error" small {...props.badgeProps}>
      Ne pas contacter
    </Badge>
  );
}

export default DoNotContactBadge;
