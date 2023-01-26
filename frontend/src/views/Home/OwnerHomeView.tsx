import React, { useRef, useState } from 'react';
import {
  Callout,
  CalloutText,
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
import {
  createOwnerProspect,
  getLocality,
} from '../../store/actions/ownerProspectAction';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import OwnerProspectForm from './OwnerProspectForm';
import { PartialOwnerProspect } from '../../models/OwnerProspect';
import Alert from '../../components/Alert/Alert';
import { TaxKinds } from '../../models/Locality';

const EstablishmentHomeView = () => {
  const dispatch = useDispatch();
  const { trackEvent } = useMatomo();

  const { locality, ownerProspect } = useSelector(
    (state: ApplicationState) => state.ownerProspect
  );

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
      const address = JSON.parse(value) as AddressSearchResult;
      setAddress(address);
      dispatch(getLocality(address.geoCode));
    }
  };

  const onCreateOwnerProspect = (
    partialOwnerProspect: PartialOwnerProspect
  ) => {
    if (address) {
      dispatch(
        createOwnerProspect({
          ...partialOwnerProspect,
          address: address?.label,
          geoCode: address?.geoCode,
        })
      );
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
              Votre logement vacant est-il soumis à une taxe ?
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
        {locality && (
          <Row gutters spacing="pt-5w">
            <Col>
              <div className="bg-bf975 border-bf-925-active fr-p-5w">
                {locality.taxKind === TaxKinds.None ? (
                  <>
                    <Title as="h2" className="fr-h3 fr-mb-3w">
                      Non, votre logement vacant n’est pas soumis à une taxe.
                    </Title>
                    <Text spacing="mb-2w">
                      La commune de {locality.name} n’applique pas de taxe
                      spécifique sur les logements vacants.
                    </Text>
                  </>
                ) : (
                  <>
                    <Title as="h2" className="fr-h3 fr-mb-3w">
                      Oui, votre logement vacant est soumis à une taxe.
                    </Title>
                    {locality.taxKind === TaxKinds.TLV && (
                      <>
                        <Text spacing="mb-2w">
                          La commune de {locality.name} applique la 
                          <b>Taxe sur les Logements Vacants (TLV).</b>
                        </Text>
                        <Text spacing="m-0">
                          Le taux pour la première année est de <b>17%</b> puis
                          de <b>34%</b> les années suivantes.
                        </Text>
                      </>
                    )}
                    {locality.taxKind === TaxKinds.THLV && (
                      <>
                        <Text spacing="mb-2w">
                          La commune de {locality.name} applique la 
                          <b>
                            Taxe d’Habitation sur les Logements Vacants (THLV).
                          </b>
                        </Text>
                        {locality.taxRate ? (
                          <Text>
                            Le taux après 2 années de vacance est de 
                            <b>{locality.taxRate}%</b>.
                          </Text>
                        ) : (
                          <Text>
                            Le taux appliqué est cependant inconnu. Veuillez
                            vous rapprochez de votre commune pour en savoir
                            plus.
                          </Text>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </Col>
            <Col>
              {ownerProspect ? (
                <Alert
                  title=""
                  description="Merci de votre prise de contact. Votre demande a été bien prise en compte et sera traitée dans les meilleurs délais par l’équipe Zéro Logement Vacant."
                  type="success"
                />
              ) : (
                <div className="bordered fr-p-5w">
                  <Title as="h2" className="fr-h3 fr-mb-3w">
                    Vous souhaitez sortir votre logement de la vacance ?
                  </Title>
                  <Text className="subtitle" spacing="mb-2w">
                    Votre collectivité peut vous aider. Laissez vos coordonnées
                    pour être recontacté par votre collectivité.
                  </Text>
                  <OwnerProspectForm
                    onCreateOwnerProspect={onCreateOwnerProspect}
                  />
                </div>
              )}
            </Col>
          </Row>
        )}
        <Callout hasInfoIcon={false} className="fr-mt-6w">
          <CalloutText as="div">
            <Text size="lead">
              Zéro Logement Vacant est un <b>service public</b> qui aide 
              <b>les propriétaires de logement vacant</b> à rentrer en contact
              avec les collectivités afin de bénéficier 
              <b>d’accompagnements et d’aides</b> pour la remise sur le marché
            </Text>
          </CalloutText>
        </Callout>
      </Container>
    </>
  );
};

export default EstablishmentHomeView;
