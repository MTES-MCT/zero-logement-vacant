import type { FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';
import { Typography } from '@mui/material';
import Stack from '@mui/material/Stack';
import { match } from 'ts-pattern';

import Icon from '~/components/ui/Icon';

interface OwnerKindIconProps {
  kind: string;
}

function OwnerKindIcon(props: OwnerKindIconProps) {
  const icon = match(props.kind)
    .returnType<FrIconClassName | RiIconClassName | null>()
    .with('Particulier', () => 'fr-icon-user-line')
    .with(
      'SCI, Copropriété, Autres personnes morales',
      () => 'fr-icon-building-line'
    )
    .with(
      'Promoteur, Investisseur privé',
      () => 'fr-icon-money-euro-circle-line'
    )
    .with('Etat et collectivité territoriale', () => 'fr-icon-france-line')
    .with(
      'Bailleur social, Aménageur, Investisseur public',
      () => 'fr-icon-government-line'
    )
    .with('Autres', () => 'fr-icon-info-line')
    .otherwise(() => null);

  if (!icon) {
    return null;
  }

  return (
    <Stack component="section" direction="row" spacing="0.25rem" useFlexGap>
      <Icon name={icon} />
      <Typography sx={{ fontWeight: 500 }}>{props.kind}</Typography>
    </Stack>
  );
}

export default OwnerKindIcon;
