import Breadcrumb from '@codegouvfr/react-dsfr/Breadcrumb';
import Button from '@codegouvfr/react-dsfr/Button';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';
import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import type {
  AwaitingOwnerRank,
  InactiveOwnerRank,
  OwnerRank
} from '@zerologementvacant/models';
import { Array, Equivalence, Order, pipe } from 'effect';
import type { NonEmptyArray } from 'effect/Array';
import HousingOwnersEmpty from '~/components/HousingOwnersEmpty/HousingOwnersEmpty';
import createOwnerAttachmentModal from '~/components/Owner/HousingOwnerAdditionModals/OwnerAttachmentModal';
import createOwnerSearchModal from '~/components/Owner/HousingOwnerAdditionModals/OwnerSearchModal';
import HousingOwnerEditionAside, {
  type HousingOwnerEditionSchema
} from '~/components/Owner/HousingOwnerEditionAside';
import HousingOwnerTable from '~/components/Owner/HousingOwnerTable';
import { useHousingOwners } from '~/components/Owner/useHousingOwners';
import { useModalReady } from '~/hooks/useModalReady';
import { useNotification } from '~/hooks/useNotification';
import {
  computeOwnersAfterRankTransition,
  rankToLabel,
  type OwnerRankLabel
} from '~/models/HousingOwnerRank';
import type { HousingOwner, Owner } from '~/models/Owner';
import { useGetHousingQuery } from '~/services/housing.service';
import {
  useUpdateHousingOwnersMutation,
  useUpdateOwnerMutation
} from '~/services/owner.service';
import NotFoundView from '../NotFoundView';

const ownerSearchModal = createOwnerSearchModal();
const ownerAttachmentModal = createOwnerAttachmentModal();

function HousingOwnersView() {
  const { id } = useParams<{ id: string }>();
  const {
    data: housing,
    isLoading: isLoadingHousing,
    isError: isErrorHousing
  } = useGetHousingQuery(id ?? skipToken);
  const {
    owner: primaryOwner,
    housingOwners,
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
  const [ownerToAdd, setOwnerToAdd] = useState<Owner | null>(null);

  const location = useLocation();
  const isModalReady = useModalReady('owner-search-modal');

  useEffect(() => {
    if (location.state?.search && isModalReady) {
      ownerSearchModal.open();
    }
  }, [location.state?.search, isModalReady]);

  function onOwnerEdit(housingOwner: HousingOwner): void {
    setSelectedOwner(housingOwner);
    setAsideOpen(true);
  }

  async function onSave(payload: HousingOwnerEditionSchema): Promise<void> {
    if (!selectedOwner || !id || !inactiveOwners || !secondaryOwners) {
      return;
    }

    const OwnerEquivalence = Equivalence.struct({
      email: Equivalence.strict<string | null>(),
      fullName: Equivalence.string,
      birthDate: Equivalence.strict<string | null>(),
      phone: Equivalence.strict<string | null>(),
      banAddress: Equivalence.make<{ id: string } | null>(
        (a, b) => a !== null && b !== null && a.id === b.id
      )
    });
    const ownerEquals = OwnerEquivalence(
      {
        email: selectedOwner.email,
        fullName: selectedOwner.fullName,
        birthDate: selectedOwner.birthDate,
        phone: selectedOwner.phone,
        banAddress: selectedOwner.banAddress?.banId
          ? { id: selectedOwner.banAddress.banId }
          : null
      },
      {
        email: payload.email,
        fullName: payload.fullName,
        birthDate: payload.birthDate,
        phone: payload.phone,
        banAddress: payload.banAddress?.id
          ? { id: payload.banAddress.id }
          : null
      }
    );

    if (!ownerEquals) {
      await updateOwner({
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
      }).unwrap();
    }

    const rankBefore = rankToLabel(selectedOwner.rank);
    const rankAfter: OwnerRankLabel = payload.isActive
      ? payload.rank!
      : rankToLabel(
          payload.inactiveRank as Exclude<InactiveOwnerRank, AwaitingOwnerRank>
        );

    const allOwners = [...activeOwners, ...inactiveOwners];
    const housingOwners = computeOwnersAfterRankTransition(allOwners, {
      id: selectedOwner.id,
      from: rankBefore,
      to: rankAfter
    });

    if (rankBefore !== rankAfter) {
      await updateHousingOwners({
        housingId: id,
        housingOwners: housingOwners as Array<HousingOwner>
      }).unwrap();
    }

    setAsideOpen(false);
    setSelectedOwner(null);
  }

  function onSelectOwner(selected: Owner): void {
    setOwnerToAdd(selected);
    ownerSearchModal.close();
    ownerAttachmentModal.open();
  }

  function onBackFromAttachment(): void {
    setOwnerToAdd(null);
    ownerAttachmentModal.close();
    ownerSearchModal.open();
  }

  function onConfirmAttachment(): void {
    if (ownerToAdd) {
      onAddOwner(ownerToAdd);
    }
    setOwnerToAdd(null);
    ownerAttachmentModal.close();
  }

  function onAddOwner(owner: Owner): void {
    if (
      !id ||
      activeOwners.some((housingOwner) => housingOwner.id === owner.id)
    ) {
      return;
    }

    const firstAvailableRank: OwnerRank = !primaryOwner
      ? 1
      : pipe(
          activeOwners as NonEmptyArray<HousingOwner>,
          Array.map((housingOwner) => housingOwner.rank),
          Array.max(Order.number),
          // Get the next available rank
          (rank) => (rank + 1) as OwnerRank
        );
    const housingOwners = activeOwners.concat(inactiveOwners ?? []).concat({
      ...owner,
      rank: firstAvailableRank,
      idprocpte: null,
      idprodroit: null,
      locprop: null,
      propertyRight: null
    });

    updateHousingOwners({
      housingId: id,
      housingOwners
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
        {secondaryOwners?.length === 0 ? null : (
          <Button
            iconId="fr-icon-add-line"
            priority="secondary"
            style={{ alignSelf: 'flex-end' }}
            onClick={ownerSearchModal.open}
          >
            Ajouter un propriétaire
          </Button>
        )}

        <ownerSearchModal.Component
          address={housing?.rawAddress?.join(' ') ?? ''}
          exclude={housingOwners ?? []}
          onSelect={onSelectOwner}
        />
        <ownerAttachmentModal.Component
          address={housing?.rawAddress?.join(' ') ?? ''}
          owner={ownerToAdd}
          onBack={onBackFromAttachment}
          onConfirm={onConfirmAttachment}
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
                priority: 'primary',
                onClick: ownerSearchModal.open
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
