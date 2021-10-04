import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Col, Container, Link, Row, Text, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import styles from './owner.module.scss';
import { differenceInYears, format } from 'date-fns';
import { capitalize } from '../../utils/stringUtils';
import { getOwner, getOwnerHousing } from '../../store/actions/ownerAction';


const OwnerView = () => {

    const dispatch = useDispatch();
    const { id } = useParams<{id: string}>();

    const { owner, housingList } = useSelector((state: ApplicationState) => state.owner);

    useEffect(() => {
        dispatch(getOwner(id));
        dispatch(getOwnerHousing(id));
    }, [id, dispatch])

    return (
        <>
            <div className={styles.titleContainer}>
                <Container spacing="py-4w">
                    <Link
                        href="/logements"
                        isSimple
                        icon="ri-arrow-left-line"
                        iconPosition="left"
                        className="fr-pl-0">
                        Retour aux logements
                    </Link>
                    <Title as="h1" className="fr-py-2w">{owner && capitalize(owner.fullName)}</Title>
                </Container>
            </div>
            <Container spacing="py-4w">
                {owner &&
                    <Row className="fr-grid-row--center">
                        <Col n="6" className="bg-100 fr-py-2w fr-px-3w">
                            <Title as="h2" look="h3">Propriétaire</Title>

                            <Text size="lg" className="fr-mb-1w">
                                <b>Identité</b>
                            </Text>
                            <Text size="md" className="fr-mb-1w">
                                Nom&nbsp;
                                <b className="capitalize">{capitalize(owner.fullName)}</b>
                            </Text>
                            { owner.birthDate &&
                                <Text size="md" className="fr-mb-1w">
                                    Date de naissance&nbsp;
                                    <b className="capitalize"> {format(owner.birthDate, 'dd/MM/yyyy')}</b>
                                    <b> ({differenceInYears(new Date(), owner.birthDate)} ans)</b>
                                </Text>
                            }

                            <Text size="lg" className="fr-pt-5w fr-mb-1w">
                                <b>Coordonnées</b>
                            </Text>
                            <Text size="md" className="fr-mb-1w">
                                <div style={{display: 'inline-block', verticalAlign: 'top'}}>
                                    Adresse postale&nbsp;
                                </div>
                                <div style={{display: 'inline-block'}}>
                                    <b className="capitalize"> {owner.address.map((_, i) => <div key={id + '_address_' + i}>{capitalize(_)}</div>) }</b>
                                </div>
                            </Text>
                            <Text size="md" className="fr-mb-1w">
                                Adresse mail&nbsp;
                                <b>{owner.email}</b>
                            </Text>
                            <Text size="md" className="fr-mb-1w">
                                Numéro de téléphone&nbsp;
                                <b>{owner.phone}</b>
                            </Text>
                        </Col>
                        <Col n="6" className="fr-py-2w fr-px-3w">
                            <Title as="h2" look="h3">Historique du dossier</Title>
                        </Col>
                    </Row>
                }
                {housingList && housingList.map((housing, index) =>
                    <div key={housing.id} className="fr-pt-6w">
                        <Title as="h2" look="h3">Logement {index + 1}</Title>
                        <Row>
                            <Col n="4">
                                <Text size="lg" className="fr-mb-1w">
                                    <b>Emplacement</b>
                                </Text>
                                <div style={{display: 'inline-block', verticalAlign: 'top'}}>
                                    Adresse &nbsp;
                                </div>
                                <div style={{display: 'inline-block'}}>
                                    <div className="capitalize"><b>{capitalize(housing.address)}</b></div>
                                    <div><b>{capitalize(housing.municipality)}</b></div>
                                </div>
                            </Col>
                            <Col n="4">
                                <Text size="lg" className="fr-mb-1w">
                                    <b>Caractéristiques</b>
                                </Text>
                                <Text size="md" className="fr-mb-1w">
                                    Type&nbsp;
                                    <b>{housing.kind}</b>
                                </Text>
                                <Text size="md" className="fr-mb-1w">
                                    Surface&nbsp;
                                    <b>{housing.surface} m2</b>
                                </Text>
                                <Text size="md" className="fr-mb-1w">
                                    Pièces&nbsp;
                                    <b>{housing.rooms}</b>
                                </Text>
                                <Text size="md" className="fr-mb-1w">
                                    Construction&nbsp;
                                    <b>{housing.buildingYear}</b>
                                </Text>
                            </Col>
                            <Col n="4">
                                <Text size="lg" className="fr-mb-1w">
                                    <b>Situation</b>
                                </Text>
                                <Text size="md" className="fr-mb-1w">
                                    Durée de la vacance&nbsp;
                                    <b>{(new Date()).getFullYear() - housing.vacancyStart} ans ({housing.vacancyStart})</b>
                                </Text>
                            </Col>
                        </Row>
                    </div>
                )}
            </Container>
        </>
    );
};

export default OwnerView;

