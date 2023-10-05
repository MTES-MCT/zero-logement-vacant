import React, { useEffect } from 'react';
import { Col, Container, Row, Text, Title } from '../../components/_dsfr/index';
import handsPoints from '../../assets/images/hands-point.svg';
import { AddressSearchResult } from '../../services/address.service';
import { selectAddressSearchResult } from '../../store/actions/ownerProspectAction';
import { useEstablishments } from '../../hooks/useEstablishments';
import EstablishmentLinkList from '../../components/EstablishmentLinkList/EstablishmentLinkList';
import {
  getEstablishment,
  getNearbyEstablishments,
} from '../../store/actions/establishmentAction';
import AddressSearchableSelect from '../../components/AddressSearchableSelect/AddressSearchableSelect';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';

const OwnerGenericHomeView = () => {
  const dispatch = useAppDispatch();
  const { establishmentWithKinds } = useEstablishments();

  const { addressSearchResult } = useAppSelector(
    (state) => state.ownerProspect
  );

  const { establishment, nearbyEstablishments } = useAppSelector(
    (state) => state.establishment
  );

  const onSelectAddress = (addressSearchResult: AddressSearchResult) => {
    dispatch(selectAddressSearchResult(addressSearchResult));
    dispatch(
      getEstablishment(addressSearchResult.city, addressSearchResult.geoCode)
    );
  };

  useEffect(() => {
    if (establishment) {
      dispatch(getNearbyEstablishments(establishment));
    }
  }, [establishment]); //eslint-disable-line react-hooks/exhaustive-deps

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
            <AddressSearchableSelect onSelectAddress={onSelectAddress} />
          </Col>
          <Col className="align-right">
            <img
              src={handsPoints}
              style={{ maxWidth: '100%', height: '100%' }}
              alt=""
            />
          </Col>
        </Row>
        {addressSearchResult && establishment ? (
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
            <EstablishmentLinkList
              establishments={establishmentWithKinds(['Commune'])}
              title="Communes"
            />
            <EstablishmentLinkList
              establishments={establishmentWithKinds(['EPCI'])}
              title="Collectivités"
            />
          </>
        )}
      </Container>
    </>
  );
};

export default OwnerGenericHomeView;
