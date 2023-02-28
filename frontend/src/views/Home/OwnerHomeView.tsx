import React, { useRef, useState } from 'react';
import {
  Col,
  Container,
  Row,
  SearchableSelect,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import handPoints from '../../assets/images/hands-point.svg';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import addressService, {
  AddressSearchResult,
} from '../../services/address.service';
import { getLocality } from '../../store/actions/ownerProspectAction';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import { useEstablishments } from '../../hooks/useEstablishments';
import EstablishmentLinkList from '../../components/EstablishmentLinkList/EstablishmentLinkList';

const EstablishmentHomeView = () => {
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();
  const { availableEstablishments } = useEstablishments();

  const { locality, ownerProspect } = useAppSelector(
    (state) => state.ownerProspect
  );

  const [addressOptions, setAddressOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const quickSearchAbortRef = useRef<() => void | null>();

  const [address, setAddress] = useState<AddressSearchResult | undefined>(); //eslint-disable-line @typescript-eslint/no-unused-vars

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

  // const onCreateOwnerProspect = (
  //   partialOwnerProspect: PartialOwnerProspect
  // ) => {
  //   if (address) {
  //     dispatch(
  //       createOwnerProspect({
  //         ...partialOwnerProspect,
  //         address: address?.label,
  //         geoCode: address?.geoCode,
  //       })
  //     );
  //   }
  // };

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
              src={handPoints}
              style={{ maxWidth: '100%', height: '100%' }}
              alt=""
            />
          </Col>
        </Row>
        {/*{locality ? (*/}
        {/*  <Row gutters spacing="pt-5w">*/}
        {/*    <Col>*/}
        {/*      <div className="bg-bf975 border-bf-925-active fr-p-5w">*/}
        {/*        {locality.taxKind === TaxKinds.None ? (*/}
        {/*          <>*/}
        {/*            <Title as="h2" className="fr-h3 fr-mb-3w">*/}
        {/*              Non, votre logement vacant n’est pas soumis à une taxe.*/}
        {/*            </Title>*/}
        {/*            <Text spacing="mb-2w">*/}
        {/*              La commune de {locality.name} n’applique pas de taxe*/}
        {/*              spécifique sur les logements vacants.*/}
        {/*            </Text>*/}
        {/*          </>*/}
        {/*        ) : (*/}
        {/*          <>*/}
        {/*            <Title as="h2" className="fr-h3 fr-mb-3w">*/}
        {/*              Oui, votre logement vacant est soumis à une taxe.*/}
        {/*            </Title>*/}
        {/*            {locality.taxKind === TaxKinds.TLV && (*/}
        {/*              <>*/}
        {/*                <Text spacing="mb-2w">*/}
        {/*                  La commune de {locality.name} applique la */}
        {/*                  <b>Taxe sur les Logements Vacants (TLV).</b>*/}
        {/*                </Text>*/}
        {/*                <Text spacing="m-0">*/}
        {/*                  Le taux pour la première année est de <b>17%</b> puis*/}
        {/*                  de <b>34%</b> les années suivantes.*/}
        {/*                </Text>*/}
        {/*              </>*/}
        {/*            )}*/}
        {/*            {locality.taxKind === TaxKinds.THLV && (*/}
        {/*              <>*/}
        {/*                <Text spacing="mb-2w">*/}
        {/*                  La commune de {locality.name} applique la */}
        {/*                  <b>*/}
        {/*                    Taxe d’Habitation sur les Logements Vacants (THLV).*/}
        {/*                  </b>*/}
        {/*                </Text>*/}
        {/*                {locality.taxRate ? (*/}
        {/*                  <Text>*/}
        {/*                    Le taux après 2 années de vacance est de */}
        {/*                    <b>{locality.taxRate}%</b>.*/}
        {/*                  </Text>*/}
        {/*                ) : (*/}
        {/*                  <Text>*/}
        {/*                    Le taux appliqué est cependant inconnu. Veuillez*/}
        {/*                    vous rapprochez de votre commune pour en savoir*/}
        {/*                    plus.*/}
        {/*                  </Text>*/}
        {/*                )}*/}
        {/*              </>*/}
        {/*            )}*/}
        {/*          </>*/}
        {/*        )}*/}
        {/*      </div>*/}
        {/*    </Col>*/}
        {/*    <Col>*/}
        {/*      {ownerProspect ? (*/}
        {/*        <Alert*/}
        {/*          title=""*/}
        {/*          description="Merci de votre prise de contact. Votre demande a été bien prise en compte et sera traitée dans les meilleurs délais par l’équipe Zéro Logement Vacant."*/}
        {/*          type="success"*/}
        {/*        />*/}
        {/*      ) : (*/}
        {/*        <div className="bordered fr-p-5w">*/}
        {/*          <Title as="h2" className="fr-h3 fr-mb-3w">*/}
        {/*            Vous souhaitez sortir votre logement de la vacance ?*/}
        {/*          </Title>*/}
        {/*          <Text className="subtitle" spacing="mb-2w">*/}
        {/*            Votre collectivité peut vous aider. Laissez vos coordonnées*/}
        {/*            pour être recontacté par votre collectivité.*/}
        {/*          </Text>*/}
        {/*          <OwnerProspectForm*/}
        {/*            onCreateOwnerProspect={onCreateOwnerProspect}*/}
        {/*          />*/}
        {/*        </div>*/}
        {/*      )}*/}
        {/*    </Col>*/}
        {/*  </Row>*/}
        {/*) : (*/}
        {/*  <>*/}
        {/*    {availableEstablishments && (*/}
        {/*      <EstablishmentLinkList establishments={availableEstablishments} />*/}
        {/*    )}*/}
        {/*  </>*/}
        {/*)}*/}
        {localityEstablishment ? (
          <>
            <EstablishmentLinkList
              establishments={[localityEstablishment]}
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

export default EstablishmentHomeView;
