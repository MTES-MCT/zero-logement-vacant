import React, { useEffect, useState } from 'react';

import {
  Alert,
  Col,
  Row,
  Tag,
  TagGroup,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import LocalityTaxCard from '../../components/LocalityTaxesCard/LocalityTaxesCard';
import { useLocalityList } from '../../hooks/useLocalityList';
import { Locality } from '../../models/Locality';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import LocalityTaxEditionModal from '../../components/modals/LocalityTaxEditionModal/LocalityTaxEditionModal';
import { updateLocalityTax } from '../../store/actions/establishmentAction';

enum ActionSteps {
  Init,
  InProgress,
  Done,
}

interface LocalityTaxActionState {
  step: ActionSteps;
  locality: Locality;
}

const EstablishmentLocalityTaxes = () => {
  const dispatch = useDispatch();
  const { trackEvent } = useMatomo();
  const { loading } = useSelector(
    (state: ApplicationState) => state.establishment
  );
  const { localities, hasTLV, hasTHLV, hasNoTax, filterCount } =
    useLocalityList();

  const [hasTLVFilter, setHasTLVFilter] = useState<boolean>(true);
  const [hasTHLVFilter, setHasTHLVFilter] = useState<boolean>(true);
  const [hasNoTaxVFilter, setHasNoTaxFilter] = useState<boolean>(true);
  const [filteredLocalities, setFilteredLocalities] = useState<
    Locality[] | undefined
  >(localities);

  useEffect(
    () => {
      setFilteredLocalities(
        localities?.filter(
          (locality) =>
            (hasTLVFilter && hasTLV(locality)) ||
            (hasTHLVFilter && hasTHLV(locality)) ||
            (hasNoTaxVFilter && hasNoTax(locality))
        )
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [localities, hasTLVFilter, hasTHLVFilter, hasNoTaxVFilter]
  );

  const [editingState, setEditingState] = useState<
    LocalityTaxActionState | undefined
  >();

  useEffect(() => {
    if (editingState?.step === ActionSteps.InProgress && !loading) {
      setEditingState({
        step: ActionSteps.Done,
        locality: editingState.locality,
      });
    }
  }, [loading]); //eslint-disable-line react-hooks/exhaustive-deps

  const onSubmitEditingLocalityTax = (taxRate?: number) => {
    if (editingState?.locality) {
      trackEvent({
        category: TrackEventCategories.LocalityTaxes,
        action: TrackEventActions.LocalityTaxes.Update,
      });
      setEditingState({
        step: ActionSteps.InProgress,
        locality: { ...editingState.locality, taxRate },
      });
      dispatch(updateLocalityTax(editingState.locality.geoCode, taxRate));
    }
  };

  return (
    <>
      {editingState?.step === ActionSteps.Init && (
        <LocalityTaxEditionModal
          locality={editingState.locality}
          onSubmit={onSubmitEditingLocalityTax}
          onClose={() => setEditingState(undefined)}
        />
      )}
      <Title look="h5" as="h2" className="fr-mt-1w">
        Taxes sur les logements vacants
      </Title>
      {editingState?.step === ActionSteps.Done && (
        <Alert
          type="success"
          description={
            'La taxe de ' +
            editingState.locality.name +
            ' a été modifiée avec succès ! '
          }
          closable
          className="fr-mb-2w"
        />
      )}
      <TagGroup className="fr-py-1w">
        <Tag
          as="span"
          small
          selected={hasTLVFilter}
          onClick={() => setHasTLVFilter(!hasTLVFilter)}
        >
          TLV appliquée ({filterCount(hasTLV)})
        </Tag>
        <Tag
          as="span"
          small
          selected={hasTHLVFilter}
          onClick={() => setHasTHLVFilter(!hasTHLVFilter)}
        >
          THLV appliquée ({filterCount(hasTHLV)})
        </Tag>
        <Tag
          as="span"
          small
          selected={hasNoTaxVFilter}
          onClick={() => setHasNoTaxFilter(!hasNoTaxVFilter)}
        >
          Taxe non appliquée ({filterCount(hasNoTax)})
        </Tag>
      </TagGroup>
      {filteredLocalities && !filteredLocalities.length ? (
        <Text>Aucune commune</Text>
      ) : (
        <Row gutters>
          {filteredLocalities?.map((locality) => (
            <Col n="4" key={locality.name}>
              <LocalityTaxCard
                locality={locality}
                onEdit={(locality) =>
                  setEditingState({ step: ActionSteps.Init, locality })
                }
              />
            </Col>
          ))}
        </Row>
      )}
    </>
  );
};

export default EstablishmentLocalityTaxes;
