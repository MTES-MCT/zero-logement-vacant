import { fr } from '@codegouvfr/react-dsfr';
import Skeleton from '@mui/material/Skeleton';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import AppLink from '~/components/_app/AppLink/AppLink';
import Button from '@codegouvfr/react-dsfr/Button';
import { createCampaignFromGroupModal } from '~/components/Group/CreateCampaignFromGroupModal';
import { createRenameGroupModal } from '~/components/Group/RenameGroupModal';
import { createRemoveGroupModal } from '~/components/Group/RemoveGroupModal';
import FullWidthButton from '~/components/ui/FullWidthButton';
import Icon from '~/components/ui/Icon';
import type { Campaign } from '~/models/Campaign';
import type { Group as GroupModel } from '~/models/Group';
import type { GroupPayload } from '~/models/GroupPayload';
import { createdBy } from '~/models/User';
import { useFindCampaignsQuery } from '~/services/campaign.service';
import { dateShortFormat } from '~/utils/dateUtils';
import { pluralize } from '~/utils/stringUtils';

const campaignFromGroupModal = createCampaignFromGroupModal();
const renameGroupModal = createRenameGroupModal();
const removeGroupModal = createRemoveGroupModal();

interface GroupProps {
  className?: string;
  group: GroupModel;
  onCreateCampaign?(
    campaign: Pick<Campaign, 'title' | 'description' | 'sentAt'>
  ): void;
  onExport?(): void;
  onUpdate?(group: GroupPayload): void;
  onRemove?(): Promise<void>;
}

function Group(props: Readonly<GroupProps>) {
  const { data: campaigns, isLoading: isLoadingCampaigns } =
    useFindCampaignsQuery({
      filters: { groupIds: [props.group.id] }
    });

  const housing = pluralize(props.group.housingCount)('logement');
  const owners = pluralize(props.group.ownerCount)('propriétaire');

  const creator: ReactNode = props.group.createdBy
    ? ` par ${createdBy(props.group.createdBy)}`
    : null;

  const createdAtBy = `Créé le ${dateShortFormat(props.group.createdAt)}${creator}`;

  function createCampaign(
    campaign: Pick<Campaign, 'title' | 'description' | 'sentAt'>
  ): void {
    props.onCreateCampaign?.(campaign);
  }

  async function removeGroup(): Promise<void> {
    await props.onRemove?.();
  }

  function updateGroup(group: GroupPayload): void {
    props.onUpdate?.(group);
  }

  return (
    <Stack component="header" spacing="1.5rem" useFlexGap>
      <Grid container component="section" columnSpacing="1.5rem">
        <Grid size={{ xs: 12, md: 9 }} rowSpacing="1.5rem">
          <Stack direction="row" spacing="0.5rem" useFlexGap sx={{ alignItems: 'center' }}>
            <Typography component="h1" variant="h4">
              {props.group.title}
            </Typography>
            <Button
              priority="tertiary no outline"
              iconId="fr-icon-edit-line"
              iconPosition="right"
              size="small"
              onClick={renameGroupModal.open}
            >
              Modifier
            </Button>
          </Stack>
          
          <Stack direction="row" spacing="1rem" useFlexGap>
            <Stack
              direction="row"
              sx={{ alignItems: 'center' }}
              spacing="0.25rem"
            >
              <Icon name="ri-home-2-line" size="sm" />
              <Typography
                variant="body2"
                component="span"
                sx={{ fontWeight: 500 }}
              >
                {housing}
              </Typography>
            </Stack>

            <Stack
              direction="row"
              sx={{ alignItems: 'center' }}
              spacing="0.25rem"
              useFlexGap
            >
              <Icon name="fr-icon-user-line" size="sm" />
              <Typography
                variant="body2"
                component="span"
                sx={{ fontWeight: 500 }}
              >
                {owners}
              </Typography>
            </Stack>

            <Stack
              direction="row"
              sx={{ alignItems: 'center' }}
              spacing="0.25rem"
            >
              <Icon name="fr-icon-edit-box-line" size="sm" />
              <Typography
                variant="body2"
                component="span"
                sx={{ fontWeight: 500 }}
              >
                {createdAtBy}
              </Typography>
            </Stack>
          </Stack>
          {props.group.description && (
            <Stack spacing="0.5rem" useFlexGap>
              <Typography
                sx={{ color: fr.colors.decisions.text.title.grey.default }}
              >
                Description
              </Typography>
              <Typography
                sx={{
                  fontStyle: 'italic',
                  color: fr.colors.decisions.text.default.grey.default
                }}
              >
                {props.group.description}
              </Typography>
            </Stack>
          )}
        </Grid>

        <Grid
          size={{ xs: 12, md: 3 }}
          sx={{
            display: 'flex',
            flexFlow: 'column nowrap',
            alignItems: 'flex-end',
            rowGap: '1rem'
          }}
        >
          <FullWidthButton
            priority="primary"
            onClick={campaignFromGroupModal.open}
            disabled={props.group.housingCount === 0}
          >
            Créer une campagne
          </FullWidthButton>

          <FullWidthButton
            priority="secondary"
            iconId="ri-upload-2-line"
            onClick={props.onExport}
          >
            Exporter les données
          </FullWidthButton>

          <FullWidthButton
            priority="tertiary"
            iconId="ri-delete-bin-line"
            onClick={removeGroupModal.open}
          >
            Supprimer le groupe
          </FullWidthButton>
        </Grid>
      </Grid>

      {isLoadingCampaigns ? (
        <Skeleton variant="rectangular" width={400} height={24} />
      ) : campaigns && campaigns.length > 0 ? (
        <Stack spacing="0.5rem">
          <Typography sx={{ fontWeight: 500 }}>
            Campagnes basées sur ce groupe :
          </Typography>
          {campaigns.map((campaign) => (
            <AppLink
              key={campaign.id}
              to={`/campagnes/${campaign.id}`}
              isSimple
            >
              {campaign.title}
            </AppLink>
          ))}
        </Stack>
      ) : null}

      <campaignFromGroupModal.Component
        group={props.group}
        size="large"
        onSubmit={createCampaign}
      />

      <renameGroupModal.Component group={props.group} onSubmit={updateGroup} />
      <removeGroupModal.Component onSubmit={removeGroup} />
    </Stack>
  );
}

export default Group;
