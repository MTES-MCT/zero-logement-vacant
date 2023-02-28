import React, { useState } from 'react';
import {
  Col,
  Container,
  Row,
  SearchableSelect,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import handsPoints from '../../assets/images/hands-point.svg';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import addressService, {
  AddressSearchResult,
} from '../../services/address.service';
import {
  getEstablishment,
  getNearbyEstablishments,
  selectAddressSearchResult,
} from '../../store/actions/ownerProspectAction';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { useEstablishments } from '../../hooks/useEstablishments';
import EstablishmentLinkList from '../../components/EstablishmentLinkList/EstablishmentLinkList';

const OwnerGenericHomeView = () => {
  const dispatch = useDispatch();
  const { trackEvent } = useMatomo();
  const { availableEstablishments } = useEstablishments();

  const { establishment, nearbyEstablishments } = useSelector(
    (state: ApplicationState) => state.ownerProspect
  );

  const [addressOptions, setAddressOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const quickSearch = (query: string) => {
    if (query.length > 2) {
      return addressService
        .quickSearch(query)
        .then((_) => {
          setAddressOptions(
            _.map((address) => ({
              value: JSON.stringify(address),
              label: address.label,
            }))
          );
        })
        .catch((err) => console.log('error', err));
    } else {
      return setAddressOptions([]);
    }
  };

  const onSelectAddress = (value: string) => {
    if (value) {
      const address = JSON.parse(value) as AddressSearchResult;
      trackEvent({
        category: TrackEventCategories.Home,
        action: TrackEventActions.Home.SelectAddress,
        name: address.label,
      });
      dispatch(selectAddressSearchResult(address));
      dispatch(getEstablishment(address.city, address.geoCode));
      dispatch(getNearbyEstablishments(address.geoCode));
    }
  };

  return (
    <>
      <Container as="main" spacing="py-7w mb-4w">
        <Row gutters>
          <Col>
            <Title as="h1" look="h2">
              Rechercher toutes les informations concernant la vacance sur votre
              territoire
            </Title>
            <Text size="lead">
              Zéro Logement Vacant est un outil de lutte contre la vacance.
            </Text>
            <SearchableSelect
              options={addressOptions}
              label="Indiquer l'adresse de votre logement vacant"
              placeholder="Indiquer l'adresse de votre logement vacant"
              required={true}
              onTextChange={(q: string) => quickSearch(q)}
              onChange={onSelectAddress}
            />
          </Col>
          <Col className="align-right">
            <img
              src={handsPoints}
              style={{ maxWidth: '100%', height: '100%' }}
              alt=""
            />
          </Col>
        </Row>
        {establishment ? (
          <>
            <EstablishmentLinkList
              establishments={[establishment]}
              title="Résultat de la recherche"
            />
            {nearbyEstablishments && (
              <EstablishmentLinkList
                establishments={nearbyEstablishments}
                title="Communes aux alentours"
              />
            )}
          </>
        ) : (
          <>
            {availableEstablishments && (
              <EstablishmentLinkList establishments={availableEstablishments} />
            )}
          </>
        )}
      </Container>
    </>
  );
};

export default OwnerGenericHomeView;
