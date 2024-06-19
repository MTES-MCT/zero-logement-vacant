import { Col, Container, Row, Text } from '../../components/_dsfr';

import handsPoints from '../../assets/images/hands-point.svg';
import { AddressSearchResult } from '../../services/address.service';
import { useAvailableEstablishments } from '../../hooks/useAvailableEstablishments';
import EstablishmentLinkList from '../../components/EstablishmentLinkList/EstablishmentLinkList';
import AddressSearchableSelect from '../../components/AddressSearchableSelect/AddressSearchableSelect';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import { useEstablishment } from '../../hooks/useEstablishment';
import ownerProspectSlice from '../../store/reducers/ownerProspectReducer';
import Typography from '@mui/material/Typography';

const OwnerGenericHomeView = () => {
  const dispatch = useAppDispatch();
  const { availableEstablishmentWithKinds } = useAvailableEstablishments();

  const { selectAddress } = ownerProspectSlice.actions;

  const { addressSearchResult } = useAppSelector(
    (state) => state.ownerProspect
  );

  const { establishment, nearbyEstablishments } = useEstablishment(
    addressSearchResult?.city,
    addressSearchResult ? [addressSearchResult.postalCode] : undefined
  );

  const onSelectAddress = (addressSearchResult: AddressSearchResult) => {
    dispatch(selectAddress(addressSearchResult));
  };

  return (
    <>
      <Container as="main" spacing="py-7w mb-4w">
        <Row gutters>
          <Col>
            <Typography component="h1" variant="h2" mb={3}>
              Rechercher toutes les informations concernant la vacance sur votre
              territoire
            </Typography>
            <Text size="lead">
              Zéro Logement Vacant est un outil de lutte contre la vacance.
            </Text>
            <AddressSearchableSelect onSelectAddress={onSelectAddress} />
          </Col>
          <Col className="align-right d-none d-sm-block">
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
              establishments={availableEstablishmentWithKinds(['Commune'])}
              title="Communes"
            />
            <EstablishmentLinkList
              establishments={availableEstablishmentWithKinds(['EPCI'])}
              title="Collectivités"
            />
          </>
        )}
      </Container>
    </>
  );
};

export default OwnerGenericHomeView;
