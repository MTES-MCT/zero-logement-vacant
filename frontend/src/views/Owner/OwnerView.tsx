import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import classNames from 'classnames';

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
                    <Container>
                        <AppBreadcrumb additionalItems={[{url: '', label: owner.fullName}]}/>
                        {owner && <Title as="h1" className="fr-py-2w">{owner.fullName}</Title> }
                    </Container>
                </div>
                <Container spacing="py-4w">
                    <Row className="fr-grid-row--center">
                        <Col n="6" className={classNames(styles.bordered, 'fr-py-2w', 'fr-px-3w')}>
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
                            <hr />
                            <Text size="md" className="fr-mb-1w">
                                <b>Nom :&nbsp;</b>
                                <span data-testid="fullName-text">{owner.fullName}</span>
                            </Text>
                            { owner.birthDate && isValid(owner.birthDate) &&
                                <Text size="md" className="fr-mb-1w">
                                    <b>Date de naissance :&nbsp;</b>
                                    <span className="capitalize" data-testid="birthDate-text">{format(owner.birthDate, 'dd/MM/yyyy')}</span>
                                    <span> ({differenceInYears(new Date(), owner.birthDate)} ans)</span>
                                </Text>
                            }

                            <Text size="lg" className="fr-pt-5w fr-mb-1w">
                                <b>Coordonnées</b>
                            </Text>
                            <hr />
                            <Text size="md" className="fr-mb-1w">
                                <span style={{verticalAlign: 'top'}}>
                                    <b>Adresse postale :&nbsp;</b>
                                </span>
                                <span style={{display: 'inline-block'}}>
                                    <span className="capitalize">
                                        {owner.rawAddress.map((_, i) =>
                                            <span style={{display: 'block'}} key={id + '_address_' + i}>{capitalize(_)}</span>)
                                        }
                                    </span>
                                </span>
                            </Text>
                            <Text size="md" className="fr-mb-1w">
                                <b>Adresse mail :&nbsp;</b>
                                <span data-testid="email-text">{owner.email}</span>
                            </Text>
                            <Text size="md" className="fr-mb-1w">
                                <b>Numéro de téléphone &nbsp;</b>
                                <span data-testid="phone-text">{owner.phone}</span>
                            </Text>
                        </Col>
                        <Col n="6" className="fr-py-2w fr-px-3w">
                            <OwnerEvents ownerId={owner.id} />
                        </Col>
                    </Row>
                    {housingList.map((housing, index) =>
                        <Row key={housing.id} className="bg-100 fr-p-3w fr-my-2w">
                            <Col n="12">
                                <Title as="h2" look="h3" className="fr-mb-0">Logement {index + 1}</Title>
                                <Text size="xs" className="fr-mb-2w">{housing.invariant}</Text>
                            </Col>
                            <Col n="4">
                                <Text size="lg" className="fr-mb-1w">
                                    <b>Emplacement</b>
                                </Text>
                                <span style={{verticalAlign: 'top'}}>
                                    <b>Adresse :&nbsp;</b>
                                </span>
                                <span style={{display: 'inline-block'}} className="capitalize">
                                    <span  style={{display: 'block'}}>
                                        {housing.rawAddress.map((_, i) =>
                                            <span style={{display: 'block'}} key={id + '_address_' + i}>{capitalize(_)}</span>)
                                        }
                                    </span>
                                </span>
                            </Col>
                            <Col n="4">
                                <Text size="lg" className="fr-mb-1w">
                                    <b>Caractéristiques</b>
                                </Text>
                                <Text size="md" className="fr-mb-1w">
                                    <b>Type :&nbsp;</b>
                                    {housing.housingKind}
                                </Text>
                                <Text size="md" className="fr-mb-1w">
                                    <b>Surface :&nbsp;</b>
                                    {housing.livingArea} m2
                                </Text>
                                <Text size="md" className="fr-mb-1w">
                                    <b>Pièces :&nbsp;</b>
                                    {housing.roomsCount}
                                </Text>
                                <Text size="md" className="fr-mb-1w">
                                    <b>Construction :&nbsp;</b>
                                    {housing.buildingYear}
                                </Text>
                            </Col>
                            <Col n="4">
                                <Text size="lg" className="fr-mb-1w">
                                    <b>Situation</b>
                                </Text>
                                <Text size="md" className="fr-mb-1w">
                                    <b>Durée de la vacance :&nbsp;</b>
                                    {(new Date()).getFullYear() - housing.vacancyStartYear} ans ({housing.vacancyStartYear})
                                </Text>
                            </Col>
                        </Row>
                    )}
                </Container>
            </>}
        </>
    );
};

export default OwnerView;

