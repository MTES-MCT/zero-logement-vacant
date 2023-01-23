import React, { useRef, useState } from 'react';
import {
  Col,
  Container,
  Row,
  SearchableSelect,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import building from '../../assets/images/building.svg';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import addressService, {
  AddressSearchResult,
} from '../../services/address.service';

const EstablishmentHomeView = () => {
  const { trackEvent } = useMatomo();

  const [addressOptions, setAddressOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const quickSearchAbortRef = useRef<() => void | null>();
  const [address, setAddress] = useState<AddressSearchResult | undefined>();

  const quickSearch = (query: string) => {
    if (quickSearchAbortRef.current) {
      quickSearchAbortRef.current();
    }
    const quickSearchService = addressService.quickSearchService();
    quickSearchAbortRef.current = quickSearchService.abort;

    if (query.length > 2) {
      trackEvent({
        category: TrackEventCategories.Dashboard,
        action: TrackEventActions.Dashboard.QuickSearch,
      });
      return quickSearchService
        .fetch(query)
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
      setAddress(JSON.parse(value));
    }
  };

  return (
    <>
      <Container as="main" spacing="py-7w mb-4w">
        <Row gutters>
          <Col>
            <Title as="h1" look="h4">
              Vous êtes propriétaire d'un logement vacant ?
            </Title>
            <Title as="h2" look="h1">
              Votre logement vcant est-il soumis à une taxe ?
            </Title>
            <Text size="lead" className="fr-py-4w">
              Le simulateur pour savoir si son logement vacant est soumis à une
              taxe sur la vacance et si oui quels taux sont appliqués.
            </Text>
            <SearchableSelect
              options={addressOptions}
              label="Adresse de votre logement vacant"
              placeholder="Indiquer l'adresse de votre logement vacant"
              required={true}
              onTextChange={(q: string) => quickSearch(q)}
              onChange={onSelectAddress}
            />
          </Col>
          <Col className="align-right">
            <img
              src={building}
              style={{ maxWidth: '100%', height: '100%' }}
              alt=""
            />
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default EstablishmentHomeView;
