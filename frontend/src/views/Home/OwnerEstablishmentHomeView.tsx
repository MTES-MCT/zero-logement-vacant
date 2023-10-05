import React, { useEffect, useMemo } from 'react';
import { Col, Container, Row, Text, Title } from '../../components/dsfr/index';
import { useLocation, useParams } from 'react-router-dom';
import { createOwnerProspect } from '../../store/actions/ownerProspectAction';
import OwnerProspectForm from './OwnerProspectForm';
import handsPoints from '../../assets/images/hands-point.svg';
import handsGrip from '../../assets/images/hands-grip.svg';
import handsPinch from '../../assets/images/hands-pinch.svg';
import handsShow from '../../assets/images/hands-show.svg';
import { unCapitalize } from '../../utils/stringUtils';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './home.module.scss';
import ContactPointCard from '../../components/ContactPoint/ContactPointCard';
import {
  getEstablishment,
  getNearbyEstablishments,
} from '../../store/actions/establishmentAction';
import EstablishmentLinkList from '../../components/EstablishmentLinkList/EstablishmentLinkList';
import LocalityTaxesCard from '../../components/LocalityTaxesCard/LocalityTaxesCard';
import { TaxKinds } from '../../models/Locality';
import { OwnerProspect } from '../../models/OwnerProspect';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import classNames from 'classnames';
import { useFindContactPointsQuery } from '../../services/contact-point.service';
import { useLocalityList } from '../../hooks/useLocalityList';
import { useSettings } from '../../hooks/useSettings';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Tag from '@codegouvfr/react-dsfr/Tag';
import Button from '@codegouvfr/react-dsfr/Button';

const OwnerEstablishmentHomeView = () => {
  const dispatch = useAppDispatch();
  const { pathname } = useLocation();

  const { establishmentRef } = useParams<{ establishmentRef: string }>();

  const { ownerProspect, addressSearchResult } = useAppSelector(
    (state) => state.ownerProspect
  );

  const { establishment, nearbyEstablishments, epciEstablishment } =
    useAppSelector((state) => state.establishment);

  const { settings } = useSettings(establishment?.id ?? epciEstablishment?.id);

  const { data: contactPoints } = useFindContactPointsQuery(
    {
      establishmentId: (establishment?.available
        ? establishment?.id
        : epciEstablishment?.id)!,
      publicOnly: true,
    },
    {
      skip: !(establishment?.available
        ? establishment?.id
        : epciEstablishment?.id),
    }
  );

  const isLocality = useMemo(
    () => pathname.startsWith('/communes'),
    [pathname]
  );

  const { refName, geoCode } = useMemo(
    () => ({
      refName: isLocality
        ? establishmentRef.slice(0, establishmentRef.lastIndexOf('-'))
        : establishmentRef,
      geoCode: isLocality
        ? establishmentRef.slice(establishmentRef.lastIndexOf('-') + 1)
        : undefined,
    }),
    [establishmentRef, isLocality]
  );

  useDocumentTitle(establishment?.name);
  const { localities } = useLocalityList(establishment?.id);

  useEffect(() => {
    if (refName) {
      dispatch(getEstablishment(refName, geoCode));
    }
  }, [dispatch, refName, geoCode]);

  useEffect(() => {
    if (establishment) {
      dispatch(getNearbyEstablishments(establishment));
    }
  }, [establishment]); //eslint-disable-line react-hooks/exhaustive-deps

  const onCreateOwnerProspect = (ownerProspect: OwnerProspect) => {
    dispatch(
      createOwnerProspect({
        ...ownerProspect,
      })
    );
  };

  return (
    <main>
      {establishment && (
        <Container as="section" spacing="py-7w" className="py-xs-3w">
          <Row gutters>
            <Col>
              <Title as="h1" look="h2" className="color-bf525" spacing="mb-1w">
                {establishment.shortName.toUpperCase()}
              </Title>
              <Title as="h2" look="h1">
                Bienvenue sur le site d’information pour les propriétaires de
                logements vacants
              </Title>
              {establishment.available ? (
                <Tag className="fr-mb-2w bg-bf925">
                  {isLocality ? 'Commune' : 'Collectivité'} engagée contre la
                  vacance
                </Tag>
              ) : (
                epciEstablishment?.available && (
                  <Tag className="fr-mb-2w bg-bf925">
                    Commune au sein d’une intercommunalité engagée contre la
                    vacance
                  </Tag>
                )
              )}
              {establishment.available || epciEstablishment?.available ? (
                <>
                  <Text>
                    <b>
                      {isLocality ? (
                        <>La {unCapitalize(establishment.name)}</>
                      ) : (
                        establishment.name
                      )}
                    </b>
                      s’engage à lutter contre la vacance au côté de l’outil 
                    <span className="color-bf113 weight-400">
                      Zéro Logement Vacant.
                    </span>
                  </Text>
                </>
              ) : (
                <Text>
                  <b>
                    {isLocality ? (
                      <>La {unCapitalize(establishment.name)}</>
                    ) : (
                      establishment.name
                    )}
                  </b>
                    n’utilise pas encore l’outil 
                  <span className="color-bf113 weight-400">
                    Zéro Logement Vacant
                  </span>
                  . Il se peut que les informations soient incomplètes.
                </Text>
              )}
            </Col>
            <Col className="align-right d-none d-sm-block">
              <img
                src={handsPoints}
                style={{ maxWidth: '100%', height: '100%' }}
                alt=""
              />
            </Col>
          </Row>
        </Container>
      )}
      {localities && localities.length > 0 && (
        <Container as="section" spacing="py-6w" className="py-xs-3w">
          <Title as="h2" look="h3">
            Les taxes sur la vacance
          </Title>
          {isLocality ? (
            <div className="bg-bf950 fr-p-3w">
              {localities[0].taxKind === TaxKinds.None ? (
                <>
                  <Title as="h3" look="h5" spacing="mb-1w">
                    Votre logement vacant n’est pas soumis à une taxe.
                  </Title>
                  <Text spacing="mb-0">
                    La commune de {localities[0].name} n’applique pas de taxe
                    spécifique sur les logements vacants.
                  </Text>
                </>
              ) : (
                <>
                  <Title as="h3" look="h5" spacing="mb-1w">
                    Votre logement vacant est soumis à une taxe.
                  </Title>
                  {localities[0].taxKind === TaxKinds.TLV && (
                    <>
                      <Text spacing="mb-1w">
                        La commune de {localities[0].name} applique la
                        <b>Taxe sur les Logements Vacants (TLV).</b>
                      </Text>
                      <Text spacing="m-0">
                        Le taux pour la première année est de <b>17%</b> puis de
                        <b>34%</b> les années suivantes.
                      </Text>
                    </>
                  )}
                  {localities[0].taxKind === TaxKinds.THLV && (
                    <>
                      <Text spacing="mb-1w">
                        La commune de {localities[0].name} applique la
                        <b>
                          Taxe d’Habitation sur les Logements Vacants (THLV).
                        </b>
                      </Text>
                      {localities[0].taxRate ? (
                        <Text spacing="m-0">
                          Le taux après 2 années de vacance est de 
                          <b>{localities[0].taxRate}%</b>.
                        </Text>
                      ) : (
                        <Text spacing="m-0">
                          Le taux appliqué est cependant inconnu. Veuillez vous
                          rapprocher de votre commune pour en savoir plus.
                        </Text>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <Row gutters>
              {localities?.map((locality) => (
                <Col className="fr-col-12 fr-col-sm-4" key={locality.geoCode}>
                  <LocalityTaxesCard
                    locality={locality}
                    isPublicDisplay={true}
                  />
                </Col>
              ))}
            </Row>
          )}
        </Container>
      )}
      <Container as="section" spacing="py-6w" className="py-xs-3w">
        <Title as="h2" look="h3">
          Pourquoi sortir de la vacance ?
        </Title>
        <Row gutters>
          <Col className={classNames(styles.cardCol, 'fr-col-12 fr-col-sm-4')}>
            <div>
              <img src={handsGrip} alt="" />
            </div>
            <Title as="h4" look="h6" spacing="my-1w">
              Ne plus être assujetti à la taxe
            </Title>
            <Text>
              En remettant votre logement sur le marché, par la réoccupation, la
              location ou la vente, vous ne serez plus soumis à la taxation sur
              la vacance. Vous pourrez instantanément déclarer ce changement via
              le nouveau portail des impôts : Gérer Mes Biens Immobiliers.
            </Text>
          </Col>
          <Col className={classNames(styles.cardCol, 'fr-col-12 fr-col-sm-4')}>
            <div>
              <img src={handsShow} style={{ maxWidth: '100%' }} alt="" />
            </div>
            <Title as="h4" look="h6" spacing="my-1w">
              Protéger votre patrimoine
            </Title>
            <Text>
              L’inoccupation à long terme accroit les risques de dégradations et
              de squats. Louer ou vendre vous protégera de ces dommages tout en
              générant des revenus complémentaires. En louant, vous pourrez
              aussi bénéficier d’avantages fiscaux tels que le Loc’Avantages.
            </Text>
          </Col>
          <Col className={classNames(styles.cardCol, 'fr-col-12 fr-col-sm-4')}>
            <div>
              <img src={handsPinch} alt="" />
            </div>
            <Title as="h4" look="h6" spacing="my-1w">
              Contribuez à réduire la crise du logement
            </Title>
            <Text>
              En mettant votre bien en location ou en le vendant pour qu’il soit
              réoccupé, vous aiderez les personnes en quête d'un logement. Vous
              contribuerez aussi à la vitalité ou à la revitalisation de votre
              territoire.
            </Text>
          </Col>
        </Row>
      </Container>
      {contactPoints && contactPoints.length > 0 && (
        <Container as="section" spacing="py-6w" className="py-xs-3w">
          <Title as="h2" look="h3">
            Les guichets contacts
          </Title>
          <Row gutters>
            {contactPoints?.map((contactPoint) => (
              <Col className="fr-col-12 fr-col-sm-4" key={contactPoint.id}>
                <ContactPointCard
                  contactPoint={contactPoint}
                  isPublicDisplay={true}
                />
              </Col>
            ))}
          </Row>
        </Container>
      )}
      <div className="bg-bf950">
        <Container as="section" spacing="py-11w" className="py-xs-0">
          <Row gutters>
            {(establishment?.available || epciEstablishment?.available) &&
              settings?.inbox?.enabled && (
                <Col
                  className={classNames(
                    styles.ownerFormContainer,
                    'fr-col-12',
                    'fr-col-sm-7'
                  )}
                >
                  <Text className="color-bf525" spacing="mb-1w">
                    PROPRIÉTAIRE DE LOGEMENT VACANT
                  </Text>
                  <Title as="h2" look="h2" spacing="mb-1w">
                    Vous souhaitez sortir votre logement de la vacance ?
                  </Title>
                  <Text size="md" className="subtitle">
                    Votre collectivité peut vous aider. Laissez vos coordonnées
                    pour être recontacté par votre collectivité.
                  </Text>
                  {ownerProspect ? (
                    <Alert
                      description="Merci de votre prise de contact. Votre demande a été bien prise en compte et sera traitée dans les meilleurs délais par l’équipe Zéro Logement Vacant."
                      severity="success"
                      small
                    />
                  ) : (
                    <OwnerProspectForm
                      onCreateOwnerProspect={onCreateOwnerProspect}
                      addressSearchResult={addressSearchResult}
                    />
                  )}
                </Col>
              )}
            <Col
              className={classNames(styles.ownerFormContainer, 'h-fit-content')}
            >
              <Title as="h2" look="h2" spacing="mb-1w">
                Votre logement n’est pas vacant ?
              </Title>
              <Text size="md" className="subtitle">
                Rendez-vous sur le site Gérer mes biens immobiliers, le service
                pour les usagers propriétaires.
              </Text>
              <Button
                linkProps={{
                  to: 'https://www.impots.gouv.fr/actualite/gerer-mes-biens-immobiliers-un-nouveau-service-en-ligne-pour-les-usagers-proprietaires-1',
                  target: '_blank',
                }}
              >
                Se rendre sur le site de GMBI
              </Button>
            </Col>
          </Row>
        </Container>
      </div>
      {nearbyEstablishments && (
        <Container as="section" spacing="my-6w">
          <EstablishmentLinkList
            establishments={nearbyEstablishments}
            title="Communes aux alentours"
          />
        </Container>
      )}
    </main>
  );
};

export default OwnerEstablishmentHomeView;
