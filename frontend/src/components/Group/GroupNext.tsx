import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { match, Pattern } from 'ts-pattern';

import AppLink from '~/components/_app/AppLink/AppLink';
import { createCampaignFromGroupModal } from '~/components/Group/CreateCampaignFromGroupModal';
import { createRemoveGroupModal } from '~/components/Group/RemoveGroupModal';
import { createRenameGroupModal } from '~/components/Group/RenameGroupModal';
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

export interface GroupProps {
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
  const findCampaignsQuery = useFindCampaignsQuery({
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
    campaignFromGroupModal.close();
  }

  function removeGroup(): void {
    props.onRemove?.();
    removeGroupModal.close();
  }

  function updateGroup(group: GroupPayload): void {
    props.onUpdate?.(group);
    renameGroupModal.close();
  }

  return (
    <>
      <Stack component="header" spacing="1.5rem" useFlexGap>
        <Grid container component="section" columnSpacing="1.5rem">
          <Grid
            size={{ xs: 12, md: 9 }}
            sx={{ display: 'flex', flexDirection: 'column', rowGap: '0.5rem' }}
          >
            <Stack
              direction="row"
              spacing="0.5rem"
              useFlexGap
              sx={{ alignItems: 'center' }}
            >
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
                  {props.group.housingCount} {housing}
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
                  {props.group.ownerCount} {owners}
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

            {props.group.description ? (
              <>
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
              </>
            ) : null}
          </Grid>

          <Grid
            size={{ xs: 12, md: 3 }}
            sx={{
              display: 'flex',
              flexFlow: 'column nowrap',
              alignItems: 'flex-end'
            }}
          >
            <ul
             
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                width: '100%',
                alignItems: 'flex-end'
              }}
            >
              <li style={{ width: '100%' }}>
                <FullWidthButton
                  priority="primary"
                  onClick={campaignFromGroupModal.open}
                  disabled={props.group.housingCount === 0}
                >
                  Créer une campagne
                </FullWidthButton>
              </li>

              <li style={{ width: '100%' }}>
                <FullWidthButton
                  priority="secondary"
                  iconId="ri-upload-2-line"
                  onClick={props.onExport}
                >
                  Exporter les données
                </FullWidthButton>
              </li>

              <li style={{ width: '100%' }}>
                <FullWidthButton
                  priority="tertiary"
                  iconId="ri-delete-bin-line"
                  onClick={removeGroupModal.open}
                >
                  Supprimer le groupe
                </FullWidthButton>
              </li>
            </ul>
          </Grid>
        </Grid>

        {match(findCampaignsQuery)
          .with({ isLoading: true }, () => (
            <Skeleton variant="rectangular" width={400} height={24} />
          ))
          .with(
            {
              isSuccess: true,
              data: [Pattern.any, ...Pattern.array(Pattern.any)]
            },
            ({ data: campaigns }) => (
              <Stack spacing="0.5rem" useFlexGap>
                <Typography sx={{ fontWeight: 500 }}>
                  Campagnes basées sur ce groupe :
                </Typography>
                {campaigns.map((campaign) => (
                  <AppLink
                    key={campaign.id}
                    to={`/campagnes/${campaign.id}`}
                    isSimple
                  >
                    <Stack direction="row" spacing="0.25rem" useFlexGap>
                      <Icon
                        name="ri-mail-fill"
                        color={
                          fr.colors.decisions.text.actionHigh.blueFrance.default
                        }
                        size="sm"
                      />
                      <Typography component="span">{campaign.title}</Typography>
                    </Stack>
                  </AppLink>
                ))}
              </Stack>
            )
          )
          .otherwise(() => null)}
      </Stack>

      <campaignFromGroupModal.Component
        group={props.group}
        onSubmit={createCampaign}
      />
      <renameGroupModal.Component group={props.group} onSubmit={updateGroup} />
      <removeGroupModal.Component onSubmit={removeGroup} />
    </>
  );
}

export default Group;
