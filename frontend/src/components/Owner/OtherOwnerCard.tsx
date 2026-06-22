import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  isDoNotContactOwnerRank,
  type OwnerRank,
  type PropertyRight
} from '@zerologementvacant/models';

import RankBadge from '~/components/Owner/RankBadge';
import Icon from '~/components/ui/Icon';

import PropertyRightTag from './PropertyRightTag';

interface OtherOwnerCardProps {
  id: string;
  name: string;
  propertyRight: PropertyRight | null;
  rank?: OwnerRank | null;
}

function OtherOwnerCardNext(props: OtherOwnerCardProps) {
  return (
    <Stack
      component="article"
      direction="row"
      spacing="0.5rem"
      useFlexGap
      sx={{
        border: `1px solid ${fr.colors.decisions.border.default.grey.default}`,
        px: '1rem',
        py: '0.5rem',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      <Stack component="section" spacing="0.25rem" useFlexGap>
        <Stack direction="row" spacing="0.25rem" useFlexGap>
          <Icon
            name="fr-icon-user-fill"
            size="sm"
            color={fr.colors.decisions.text.disabled.grey.default}
          />
          <Typography sx={{ fontWeight: 700 }}>{props.name}</Typography>
        </Stack>

        {typeof props.rank === 'number' &&
        isDoNotContactOwnerRank(props.rank) ? (
          <Stack direction="row" useFlexGap>
            <RankBadge value={props.rank} />
          </Stack>
        ) : null}

        {!props.propertyRight ? null : (
          <PropertyRightTag value={props.propertyRight} />
        )}
      </Stack>

      <Stack component="footer" sx={{ alignSelf: 'flex-end' }}>
        <Button
          linkProps={{
            to: `/proprietaires/${props.id}`,
            target: '_blank',
            rel: 'noopener noreferrer'
          }}
          iconId="fr-icon-external-link-line"
          iconPosition="right"
          priority="tertiary no outline"
          size="small"
        >
          Voir la fiche
        </Button>
      </Stack>
    </Stack>
  );
}

export default OtherOwnerCardNext;
