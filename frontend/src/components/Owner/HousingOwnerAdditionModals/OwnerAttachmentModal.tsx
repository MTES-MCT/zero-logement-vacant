import { fr } from '@codegouvfr/react-dsfr';
import { Tag } from '@codegouvfr/react-dsfr/Tag';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { getAddress } from '@zerologementvacant/models';

import LabelNext from '~/components/Label/LabelNext';
import { type ConfirmationModalProps } from '~/components/modals/ConfirmationModal/ConfirmationModalNext';
import { createExtendedModal } from '~/components/modals/ConfirmationModal/ExtendedModal';
import OwnerKindTag from '~/components/Owner/OwnerKindTag';
import Icon from '~/components/ui/Icon';
import type { Owner } from '~/models/Owner';
import { age, birthdate } from '~/utils/dateUtils';

export type OwnerAttachmentModalProps = Omit<
  ConfirmationModalProps,
  'children' | 'title'
> & {
  address: string;
  owner: Owner | null;
  onBack?(): void;
  onConfirm?(): void;
};

function createOwnerAttachmentModal() {
  const modal = createExtendedModal({
    id: 'owner-attachment-modal',
    isOpenedByDefault: false
  });

  return {
    ...modal,
    Component(props: OwnerAttachmentModalProps) {
      const ownerAddress = props.owner
        ? getAddress(props.owner).join(', ')
        : null;

      return (
        <modal.Component
          size="large"
          {...props}
          title={
            <Stack component="header">
              <LabelNext>{props.address}</LabelNext>
              <Typography component="h1" variant="h4">
                Ajouter un propriétaire
              </Typography>
            </Stack>
          }
          buttons={[
            {
              children: 'Retour',
              priority: 'secondary',
              className: fr.cx('fr-mr-2w'),
              doClosesModal: false,
              onClick: props.onBack
            },
            {
              children: 'Confirmer',
              doClosesModal: false,
              onClick: props.onConfirm
            }
          ]}
        >
          <Typography sx={{ mb: '1rem' }}>
            Confirmez-vous l’ajout de ce propriétaire ?
          </Typography>
          <Stack
            component="article"
            spacing="0.5rem"
            sx={{
              border: `1px solid ${fr.colors.decisions.border.default.grey.default}`,
              padding: '1rem'
            }}
          >
            <Stack component="section">
              <Stack
                direction="row"
                spacing="0.25rem"
                useFlexGap
                sx={{ alignItems: 'center' }}
              >
                <Icon name="fr-icon-user-fill" size="sm" />
                <LabelNext>Prénom et nom</LabelNext>
              </Stack>
              <Typography sx={{ fontWeight: 700 }}>
                {props.owner?.fullName}
              </Typography>
            </Stack>

            <Stack component="section">
              <Stack
                direction="row"
                spacing="0.25rem"
                useFlexGap
                sx={{ alignItems: 'center' }}
              >
                <Icon name="ri-id-card-line" size="sm" />
                <LabelNext>Type de propriétaire</LabelNext>
              </Stack>
              <OwnerKindTag
                value={props.owner?.kind ?? null}
                tagProps={{ small: false }}
              />
            </Stack>

            <Stack component="section">
              <Stack
                direction="row"
                spacing="0.25rem"
                useFlexGap
                sx={{ alignItems: 'center' }}
              >
                <Icon name="ri-auction-line" size="sm" />
                <LabelNext>Nature du droit sur le bien</LabelNext>
              </Stack>
              <Tag>Pas d’information</Tag>
            </Stack>

            <Stack component="section">
              <Stack
                direction="row"
                spacing="0.25rem"
                useFlexGap
                sx={{ alignItems: 'center' }}
              >
                <Icon name="fr-icon-calendar-2-line" size="sm" />
                <LabelNext>Date de naissance</LabelNext>
              </Stack>
              <Typography>
                {props.owner?.birthDate
                  ? `${birthdate(props.owner.birthDate)} (${age(props.owner.birthDate)} ans)`
                  : 'Pas d’information'}
              </Typography>
            </Stack>

            <Stack component="section">
              <Stack
                direction="row"
                spacing="0.25rem"
                useFlexGap
                sx={{ alignItems: 'center' }}
              >
                <Icon name="fr-icon-home-4-line" size="sm" />
                <LabelNext>Adresse postale</LabelNext>
              </Stack>
              <Typography>{ownerAddress}</Typography>
            </Stack>
          </Stack>
        </modal.Component>
      );
    }
  };
}

export default createOwnerAttachmentModal;
