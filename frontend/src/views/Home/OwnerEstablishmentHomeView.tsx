import React, { useEffect, useMemo } from 'react';
import {
  Alert,
  Col,
  Container,
  Link,
  Row,
  Tag,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { useLocation, useParams } from 'react-router-dom';
import {
  createOwnerProspect,
  getEstablishment,
} from '../../store/actions/ownerProspectAction';
import OwnerProspectForm from './OwnerProspectForm';
import { PartialOwnerProspect } from '../../models/OwnerProspect';
import handsPoints from '../../assets/images/hands-point.svg';
import handsGrip from '../../assets/images/hands-grip.svg';
import handsPinch from '../../assets/images/hands-pinch.svg';
import handsShow from '../../assets/images/hands-show.svg';
import { unCapitalize } from '../../utils/stringUtils';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './home.module.scss';

const OwnerEstablishmentHomeView = () => {
  const dispatch = useDispatch();
  const { pathname } = useLocation();

  const { establishmentRef } = useParams<{ establishmentRef: string }>();

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

  const { ownerProspect, addressSearchResult, establishment } = useSelector(
    (state: ApplicationState) => state.ownerProspect
  );

  useDocumentTitle(establishment?.name);

  useEffect(() => {
    if (refName) {
      dispatch(getEstablishment(refName, geoCode));
    }
  }, [dispatch]); //eslint-disable-line react-hooks/exhaustive-deps

  const onCreateOwnerProspect = (
    partialOwnerProspect: PartialOwnerProspect
  ) => {
    if (geoCode) {
      dispatch(
        createOwnerProspect({
          ...partialOwnerProspect,
          address: addressSearchResult?.label,
          geoCode,
        })
      );
    }
  };

  return (
    <main>
      {establishment && (
        <Container as="section" spacing="py-7w mb-4w">
          <Row gutters>
            <Col>
              <Title as="h1" look="h2" className="color-bf525" spacing="mb-1w">
                {establishment.shortName.toUpperCase()}
              </Title>
              <Title as="h2" look="h1">
                Bienvenue sur le site d’information sur la vacance du territoire
              </Title>
              {establishment.available ? (
                <>
                  <Tag className="fr-mb-2w bg-bf925">
                    {isLocality ? 'Commune' : 'Collectivités'} engagée contre la
                    vacance
                  </Tag>
                  <Text>
                    <b>
                      {isLocality ? (
                        <>La {unCapitalize(establishment.name)}</>
                      ) : (
                        establishment.name
                      )}
                    </b>
                      s’engage à lutter contre la vacance au coté de l’outil 
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
            <Col className="align-right">
              <img
                src={handsPoints}
                style={{ maxWidth: '100%', height: '100%' }}
                alt=""
              />
            </Col>
          </Row>
        </Container>
      )}
      <Container as="section">
        {/*{locality && (*/}
        {/*  <section className="bg-bf975 fr-p-5w">*/}
        {/*    {locality.taxKind === TaxKinds.None ? (*/}
        {/*      <>*/}
        {/*        <Text>*/}
        {/*          Votre commune n’est pas soumis à la TLV. Il est possible que*/}
        {/*          votre commune soit soumis à la THLV.*/}
        {/*        </Text>*/}
        {/*        <Title as="h2" className="fr-h3 fr-mb-3w">*/}
        {/*          Non, votre logement vacant n’est pas soumis à une taxe.*/}
        {/*        </Title>*/}
        {/*        <Text spacing="mb-2w">*/}
        {/*          La commune de {locality.name} n’applique pas de taxe*/}
        {/*          spécifique sur les logements vacants.*/}
        {/*        </Text>*/}
        {/*      </>*/}
        {/*    ) : (*/}
        {/*      <>*/}
        {/*        <Title as="h2" className="fr-h3 fr-mb-3w">*/}
        {/*          Oui, votre logement vacant est soumis à une taxe.*/}
        {/*        </Title>*/}
        {/*        {locality.taxKind === TaxKinds.TLV && (*/}
        {/*          <>*/}
        {/*            <Text spacing="mb-2w">*/}
        {/*              La commune de {locality.name} applique la*/}
        {/*              <b>Taxe sur les Logements Vacants (TLV).</b>*/}
        {/*            </Text>*/}
        {/*            <Text spacing="m-0">*/}
        {/*              Le taux pour la première année est de <b>17%</b> puis de */}
        {/*              <b>34%</b> les années suivantes.*/}
        {/*            </Text>*/}
        {/*          </>*/}
        {/*        )}*/}
        {/*        {locality.taxKind === TaxKinds.THLV && (*/}
        {/*          <>*/}
        {/*            <Text spacing="mb-2w">*/}
        {/*              La commune de {locality.name} applique la*/}
        {/*              <b>Taxe d’Habitation sur les Logements Vacants (THLV).</b>*/}
        {/*            </Text>*/}
        {/*            {locality.taxRate ? (*/}
        {/*              <Text>*/}
        {/*                Le taux après 2 années de vacance est de*/}
        {/*                <b>{locality.taxRate}%</b>.*/}
        {/*              </Text>*/}
        {/*            ) : (*/}
        {/*              <Text>*/}
        {/*                Le taux appliqué est cependant inconnu. Veuillez vous*/}
        {/*                rapprochez de votre commune pour en savoir plus.*/}
        {/*              </Text>*/}
        {/*            )}*/}
        {/*          </>*/}
        {/*        )}*/}
        {/*      </>*/}
        {/*    )}*/}
        {/*  </section>*/}
        {/*)}*/}
      </Container>
      <Container as="section">
        <Title as="h2" look="h3">
          Pourquoi sortir de la vacance ?
        </Title>
        <Row gutters>
          <Col className={styles.cardCol}>
            <div>
              <img src={handsGrip} alt="" />
            </div>
          </Col>
          <Col className={styles.cardCol}>
            <div>
              <img src={handsShow} style={{ maxWidth: '100%' }} alt="" />
            </div>
          </Col>
          <Col className={styles.cardCol}>
            <div>
              <img src={handsPinch} alt="" />
            </div>
          </Col>
        </Row>
        <Row gutters>
          <Col n="4">
            <Title as="h4" look="h6" spacing="mb-1w">
              Rentabilité financière accrue
            </Title>
            <Text>
              Louez votre logements vacants vous rapportera un revenu
              supplémentaire en passant par de l’intermediation locative.
            </Text>
          </Col>
          <Col n="4">
            <Title as="h4" look="h6" spacing="mb-1w">
              Durabilité à long terme
            </Title>
            <Text>
              En prévenant les dommages causés par l'inoccupation à long terme,
              la location de logements vacants peut aider à prolonger la
              durabilité et la vie utile des bâtiments, ce qui peut réduire la
              demande pour la
            </Text>
          </Col>
          <Col n="4">
            <Title as="h4" look="h6" spacing="mb-1w">
              Stimulez de l'économie locale & atténuez de la pénurie de
              logements
            </Title>
            <Text>
              Contribuer à améliorer la qualité de vie des personnes en quête
              d'un logement.
            </Text>
          </Col>
        </Row>
      </Container>
      <div className="bg-bf950">
        <Container as="section" spacing="py-11w">
          <Row gutters>
            <Col n="7" className="bg-white" spacing="p-8w mr-1w">
              <Text className="color-bf525" spacing="mb-1w">
                PROPRIÉTAIRE DE LOGEMENT VACANT
              </Text>
              <Title as="h2" look="h2" spacing="mb-1w">
                Vous souhaitez sortir votre logement de la vacance ?
              </Title>
              <Text size="md" className="subtitle">
                Votre collectivité peut vous aider. Laissez vos coordonnées pour
                être recontacté par votre collectivité.
              </Text>
              {ownerProspect ? (
                <Alert
                  title=""
                  description="Merci de votre prise de contact. Votre demande a été bien prise en compte et sera traitée dans les meilleurs délais par l’équipe Zéro Logement Vacant."
                  type="success"
                />
              ) : (
                <OwnerProspectForm
                  onCreateOwnerProspect={onCreateOwnerProspect}
                />
              )}
            </Col>
            <Col className="bg-white h-fit-content" spacing="p-8w ml-1w">
              <Title as="h2" look="h2" spacing="mb-1w">
                Votre logement n’est pas vacant ?
              </Title>
              <Text size="md" className="subtitle">
                Rendez-vous sur le site Gérer mes biens immobiliers, le service
                pour les usagers propriétaires.
              </Text>
              <Link
                href="https://www.economie.gouv.fr/ouverture-service-en-ligne-gerer-mes-biens-immobiliers"
                target="_blank"
                className="fr-btn"
              >
                Se rendre sur le site de GMBI
              </Link>
            </Col>
          </Row>
        </Container>
      </div>
    </main>
  );
};

export default OwnerEstablishmentHomeView;
