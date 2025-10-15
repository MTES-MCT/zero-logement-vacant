import Breadcrumb from '@codegouvfr/react-dsfr/Breadcrumb';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import type {
  AwaitingOwnerRank,
  InactiveOwnerRank
} from '@zerologementvacant/models';
import HousingOwnersEmpty from '~/components/HousingOwnersEmpty/HousingOwnersEmpty';
import HousingOwnerAdditionModals from '~/components/Owner/HousingOwnerAdditionModals/HousingOwnerAdditionModals';
import HousingOwnerEditionAside, {
  type HousingOwnerEditionSchema
} from '~/components/Owner/HousingOwnerEditionAside';
import HousingOwnerTable from '~/components/Owner/HousingOwnerTable';
import { useHousingOwners } from '~/components/Owner/useHousingOwners';
import { useNotification } from '~/hooks/useNotification';
import {
  computeOwnersAfterRankTransition,
  rankToLabel,
  type OwnerRankLabel
} from '~/models/HousingOwnerRank';
import type { HousingOwner } from '~/models/Owner';
import { useGetHousingQuery } from '~/services/housing.service';
import {
  useUpdateHousingOwnersMutation,
  useUpdateOwnerMutation
} from '~/services/owner.service';
import NotFoundView from '../NotFoundView';

function HousingOwnersView() {
  const { id } = useParams<{ id: string }>();
  const {
    data: housing,
    isLoading: isLoadingHousing,
    isError: isErrorHousing
  } = useGetHousingQuery(id ?? skipToken);
  const {
    secondaryOwners,
    activeOwners,
    inactiveOwners,
    findOwnersQuery: { isLoading: isLoadingOwners }
  } = useHousingOwners(id ?? skipToken);

  const housingAddress: string | null = housing?.rawAddress?.join(' ') ?? null;

  const [updateOwner, updateOwnerMutation] = useUpdateOwnerMutation();
  const [updateHousingOwners, updateHousingOwnersMutation] =
    useUpdateHousingOwnersMutation();

  useNotification({
    toastId: 'housing-owner-edition-toast',
    isError: updateOwnerMutation.isError || updateHousingOwnersMutation.isError,
    isLoading:
      updateOwnerMutation.isLoading || updateHousingOwnersMutation.isLoading,
    isSuccess:
      updateOwnerMutation.isSuccess || updateHousingOwnersMutation.isSuccess,
    message: {
      error: 'Erreur lors de la modification du propriétaire',
      loading: 'Modification du propriétaire...',
      success: 'Propriétaire modifié avec succès'
    }
  });

  const [selectedOwner, setSelectedOwner] = useState<HousingOwner | null>(null);
  const [asideOpen, setAsideOpen] = useState(false);

  function onOwnerEdit(housingOwner: HousingOwner): void {
    setSelectedOwner(housingOwner);
    setAsideOpen(true);
  }

  function onSave(payload: HousingOwnerEditionSchema): void {
    if (!selectedOwner || !id || !inactiveOwners || !secondaryOwners) {
      return;
    }

    updateOwner({
      id: selectedOwner.id,
      email: payload.email,
      fullName: payload.fullName,
      birthDate: payload.birthDate,
      phone: payload.phone,
      banAddress: payload.banAddress
        ? {
            label: payload.banAddress.label,
            banId: payload.banAddress.id,
            score: payload.banAddress.score,
            longitude: payload.banAddress.longitude,
            latitude: payload.banAddress.latitude,
            postalCode: '',
            city: ''
          }
        : null,
      additionalAddress: payload.additionalAddress
    })
      .unwrap()
      .then(() => {
        const rankBefore = rankToLabel(selectedOwner.rank);
        const rankAfter: OwnerRankLabel = payload.isActive
          ? payload.rank!
          : rankToLabel(
              payload.inactiveRank as Exclude<
                InactiveOwnerRank,
                AwaitingOwnerRank
              >
            );

        const allOwners = [...activeOwners, ...inactiveOwners];
        const housingOwners = computeOwnersAfterRankTransition(allOwners, {
          id: selectedOwner.id,
          from: rankBefore,
          to: rankAfter
        });

        return updateHousingOwners({
          housingId: id,
          housingOwners: housingOwners as Array<HousingOwner>
        }).unwrap();
      })
      .then(() => {
        setAsideOpen(false);
        setSelectedOwner(null);
      });
  }

  if (!id) {
    return null;
  }

  if (isErrorHousing && !housing) {
    return <NotFoundView />;
  }

  return (
    <Container maxWidth={false} sx={{ py: '2rem' }}>
      {isLoadingHousing ? (
        <Stack spacing="0.5rem" sx={{ mb: '1.5rem' }}>
          <Skeleton variant="text" width={400} />
          <Skeleton variant="rectangular" width={600} height={32} />
        </Stack>
      ) : (
        <Stack component="header" sx={{ mb: '1.5rem' }}>
          <Breadcrumb
            className="fr-mb-0"
            currentPageLabel="Modifier les propriétaires"
            segments={[
              {
                label: housingAddress,
                linkProps: {
                  to: `/logements/${id}`
                }
              }
            ]}
          />
          <Typography component="h1" variant="h4">
            Modifier les propriétaires - {housingAddress}
          </Typography>
        </Stack>
      )}

      <Stack component="section" spacing="1.5rem" useFlexGap>
        <HousingOwnerAdditionModals
          buttonProps={{ style: { alignSelf: 'flex-end' } }}
          onOwnerSelect={() => {}}
        />

        <HousingOwnerTable
          title="Propriétaires"
          housing={housing ?? null}
          owners={activeOwners}
          isLoading={isLoadingOwners}
          columns={[
            'name',
            'kind',
            'propertyRight',
            'rank',
            'addressStatus',
            'actions'
          ]}
          empty={
            <HousingOwnersEmpty
              title={`Il n’y a pas de propriétaire${inactiveOwners?.length ? ' actuel' : ''} connu pour ce logement`}
              buttonProps={{
                priority: 'primary'
              }}
            />
          }
          onEdit={onOwnerEdit}
        />

        <HousingOwnerTable
          title="Propriétaires archivés"
          housing={housing ?? null}
          owners={inactiveOwners ?? []}
          isLoading={isLoadingOwners}
          columns={['name', 'kind', 'status', 'actions']}
          onEdit={onOwnerEdit}
        />
      </Stack>

      <HousingOwnerEditionAside
        open={asideOpen}
        onClose={() => {
          setAsideOpen(false);
          setSelectedOwner(null);
        }}
        housingOwner={selectedOwner}
        onSave={onSave}
      />
    </Container>
  );
}

export default HousingOwnersView;
