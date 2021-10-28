import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Col, Container, Row, Text, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import styles from './owner.module.scss';
import { differenceInYears, format, isValid } from 'date-fns';
import { capitalize } from '../../utils/stringUtils';
import { getOwner, getOwnerHousing, update } from '../../store/actions/ownerAction';
import { Owner } from '../../models/Owner';
import OwnerEditionModal from '../../components/modals/OwnerEditionModal/OwnerEditionModal';
import OwnerEvents from './OwnerEvents';


const OwnerView = () => {

    const dispatch = useDispatch();
    const { id } = useParams<{id: string}>();

    const [isModalOpen, setIsModalOpen] = useState(false);

    const { owner, housingList } = useSelector((state: ApplicationState) => state.owner);

    useEffect(() => {
        dispatch(getOwner(id));
        dispatch(getOwnerHousing(id));
    }, [id, dispatch])


    const updateOwner = (owner: Owner) => {
        dispatch(update(owner));
        setIsModalOpen(false);
    }

    return (
        <>
            {owner && housingList && <>
                <div className={styles.titleContainer}>
                    <Container spacing="py-4w">
                        <Link to="/logements" className="fr-pl-0 ds-fr--inline fr-link">
                            <span className="ri-1x icon-left ri-arrow-left-line ds-fr--v-middle"></span>
                            Retour aux logements
                        </Link>
                        {owner && <Title as="h1" className="fr-py-2w">{capitalize(owner.fullName)}</Title> }
                    </Container>
                </div>
                <Container spacing="py-4w">
                    <Row className="fr-grid-row--center">
                        <Col n="6" className="bg-100 fr-py-2w fr-px-3w">
                            <Row>
                                <Col>
                                    <Title as="h2" look="h3">Propriétaire</Title>
                                </Col>
                                <Col>
                                    <Button title="Modifier le propriétaire"
                                            secondary
                                            size="sm"
                                            icon="fr-fi-edit-line"
                                            className="float-right"
                                            onClick={() => {setIsModalOpen(true)}}>
                                        Modifier
                                    </Button>
                                    {isModalOpen &&
                                    <OwnerEditionModal owner={owner}
                                                       onSubmit={(owner: Owner) => updateOwner(owner)}
                                                       onClose={() => setIsModalOpen(false)} />
                                    }
                                </Col>
                            </Row>
                            <Text size="lg" className="fr-mb-1w">
                                <b>Identité</b>
                            </Text>
                            <Text size="md" className="fr-mb-1w">
                                Nom&nbsp;
                                <b className="capitalize" data-testid="fullName-text">{capitalize(owner.fullName)}</b>
                            </Text>
                            { owner.birthDate && isValid(owner.birthDate) &&
                                <Text size="md" className="fr-mb-1w">
                                    Date de naissance&nbsp;
                                    <b className="capitalize" data-testid="birthDate-text">{format(owner.birthDate, 'dd/MM/yyyy')}</b>
                                    <b> ({differenceInYears(new Date(), owner.birthDate)} ans)</b>
                                </Text>
                            }

                            <Text size="lg" className="fr-pt-5w fr-mb-1w">
                                <b>Coordonnées</b>
                            </Text>
                            <Text size="md" className="fr-mb-1w">
                                <span style={{verticalAlign: 'top'}}>
                                    Adresse postale&nbsp;
                                </span>
                                <span style={{display: 'inline-block'}}>
                                    <b className="capitalize"> {owner.address.map((_, i) =>
                                        <span style={{display: 'block'}} key={id + '_address_' + i}>{capitalize(_)}</span>) }</b>
                                </span>
                            </Text>
                            <Text size="md" className="fr-mb-1w">
                                Adresse mail&nbsp;
                                <b data-testid="email-text">{owner.email}</b>
                            </Text>
                            <Text size="md" className="fr-mb-1w">
                                Numéro de téléphone&nbsp;
                                <b data-testid="phone-text">{owner.phone}</b>
                            </Text>
                        </Col>
                        <Col n="6" className="fr-py-2w fr-px-3w">
                            <OwnerEvents ownerId={owner.id} />
                        </Col>
                    </Row>
                    {housingList.map((housing, index) =>
                        <div key={housing.id} className="fr-pt-6w">
                            <Title as="h2" look="h3">Logement {index + 1}</Title>
                            <Row>
                                <Col n="4">
                                    <Text size="lg" className="fr-mb-1w">
                                        <b>Emplacement</b>
                                    </Text>
                                    <span style={{verticalAlign: 'top'}}>
                                        Adresse &nbsp;
                                    </span>
                                    <span style={{display: 'inline-block'}} className="capitalize">
                                        <span  style={{display: 'block'}}>
                                            <b>{capitalize(housing.address)}</b>
                                        </span>
                                        <span>
                                            <b> {capitalize(housing.municipality)}</b>
                                        </span>
                                    </span>
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
            </>}
        </>
    );
};

export default OwnerView;

