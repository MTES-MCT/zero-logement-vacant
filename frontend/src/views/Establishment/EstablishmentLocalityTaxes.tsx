import React, { useEffect, useState } from 'react';

import { Col, Row, Text, Title } from '../../components/_dsfr';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import LocalityTaxCard from '../../components/LocalityTaxesCard/LocalityTaxesCard';
import { useLocalityList } from '../../hooks/useLocalityList';

import { Locality, TaxKinds, TaxKindsLabels } from '../../models/Locality';

import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import LocalityTaxEditionModal from '../../components/modals/LocalityTaxEditionModal/LocalityTaxEditionModal';
import Help from '../../components/Help/Help';
import { useUpdateLocalityTaxMutation } from '../../services/locality.service';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Tag from '@codegouvfr/react-dsfr/Tag';

interface Props {
  establishmentId: string;
}

const EstablishmentLocalityTaxes = ({ establishmentId }: Props) => {
  const { trackEvent } = useMatomo();

  const [
    updateLocalityTax,
    { isSuccess: isUpdateSuccess, isError: isUpdateError },
  ] = useUpdateLocalityTaxMutation();

  const { localities, filterCount } = useLocalityList(establishmentId);

  const [hasTLVFilter, setHasTLVFilter] = useState<boolean>(true);
  const [hasTHLVFilter, setHasTHLVFilter] = useState<boolean>(true);
  const [hasNoTaxFilter, setHasNoTaxFilter] = useState<boolean>(true);
  const [filteredLocalities, setFilteredLocalities] = useState<
    Locality[] | undefined
  >(localities);

  useEffect(
    () => {
      setFilteredLocalities(
        localities?.filter(
          (locality) =>
            (hasTLVFilter && locality.taxKind === TaxKinds.TLV) ||
            (hasTHLVFilter && locality.taxKind === TaxKinds.THLV) ||
            (hasNoTaxFilter && locality.taxKind === TaxKinds.None)
        )
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [localities, hasTLVFilter, hasTHLVFilter, hasNoTaxFilter]
  );

  const [localityToUpdate, setLocalityToUpdate] = useState<
    Locality | undefined
  >();

  const onSubmitEditingLocalityTax = (taxKind: TaxKinds, taxRate?: number) => {
    if (localityToUpdate) {
      trackEvent({
        category: TrackEventCategories.LocalityTaxes,
        action: TrackEventActions.LocalityTaxes.Update,
      });
      updateLocalityTax({
        geoCode: localityToUpdate.geoCode,
        taxKind,
        taxRate,
      }).finally(() => setLocalityToUpdate(undefined));
    }
  };

  return (
    <>
      {localityToUpdate && (
        <LocalityTaxEditionModal
          locality={localityToUpdate}
          onSubmit={onSubmitEditingLocalityTax}
        />
      )}
      <Title look="h5" as="h2" className="d-inline-block fr-mr-2w">
        Taxes sur les logements vacants
      </Title>
      <Help className="d-inline-block bg-white">
        Informations publiées par défaut
      </Help>
      {isUpdateSuccess && (
        <Alert
          severity="success"
          description={'La taxe de a été modifiée avec succès !'}
          closable
          small
          className="fr-mb-2w"
        />
      )}
      {isUpdateError && (
        <Alert
          severity="error"
          description="Une erreur s'est produite, veuillez réessayer."
          closable
          small
          className="fr-mb-2w"
        />
      )}
      <div className="fr-py-1w">
        <Tag
          small
          pressed={hasTLVFilter}
          nativeButtonProps={{
            onClick: () => setHasTLVFilter(!hasTLVFilter),
          }}
        >
          {TaxKindsLabels[TaxKinds.TLV]} (
          {filterCount((l) => l.taxKind === TaxKinds.TLV)})
        </Tag>
        <Tag
          small
          pressed={hasTHLVFilter}
          nativeButtonProps={{
            onClick: () => setHasTHLVFilter(!hasTHLVFilter),
          }}
        >
          {TaxKindsLabels[TaxKinds.THLV]} (
          {filterCount((l) => l.taxKind === TaxKinds.THLV)})
        </Tag>
        <Tag
          small
          pressed={hasNoTaxFilter}
          nativeButtonProps={{
            onClick: () => setHasNoTaxFilter(!hasNoTaxFilter),
          }}
        >
          {TaxKindsLabels[TaxKinds.None]} (
          {filterCount((l) => l.taxKind === TaxKinds.None)})
        </Tag>
      </div>
      {filteredLocalities && !filteredLocalities.length ? (
        <Text>Aucune commune</Text>
      ) : (
        <Row gutters>
          {filteredLocalities?.map((locality) => (
            <Col n="4" key={locality.name}>
              <LocalityTaxCard
                locality={locality}
                onEdit={(locality) => setLocalityToUpdate(locality)}
                isPublicDisplay={false}
              />
            </Col>
          ))}
        </Row>
      )}
    </>
  );
};

export default EstablishmentLocalityTaxes;
