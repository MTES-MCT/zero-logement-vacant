import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Col, Container, Row, Title, Link, Text } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { getHousing } from '../../store/actions/housingAction';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import styles from './housing-details.module.scss';
import { format } from 'date-fns'
import { differenceInYears } from 'date-fns'
import { capitalize } from '../../utils/stringUtils';


const HousingDetailView = () => {

    const dispatch = useDispatch();
    const { id } = useParams<{id: string}>();

    const { housingDetail } = useSelector((state: ApplicationState) => state.housing);

    useEffect(() => {
        dispatch(getHousing(id));
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
                    <Title as="h1" className="fr-py-2w">{housingDetail && capitalize(housingDetail.owner.fullName)}</Title>
                </Container>
            </div>
            {housingDetail &&
            <Container spacing="py-4w">
                <Row className="fr-grid-row--center">
                    <Col n="6" className="bg-100 fr-py-2w fr-px-3w">
                        <Title as="h2" look="h3">Propriétaire</Title>

                        <Text size="lg" className="fr-mb-1w">
                            Identité
                        </Text>
                        <Text size="md" className="fr-mb-1w">
                            Nom
                            <b className="capitalize"> {capitalize(housingDetail.owner.fullName)}</b>
                        </Text>
                        <Text size="md" className="fr-mb-1w">
                            Date de naissance
                            <b className="capitalize"> {format(housingDetail.owner.birthDate, 'dd/MM/yyyy')}</b>
                            <b> ({differenceInYears(new Date(), housingDetail.owner.birthDate)} ans)</b>
                        </Text>

                        <Text size="lg" className="fr-pt-6w fr-mb-1w">
                            Coordonnées
                        </Text>
                        <Text size="md" className="fr-mb-1w">
                            <div style={{display: 'inline-block', verticalAlign: 'top'}}>
                                Adresse postale&nbsp;
                            </div>
                            <div style={{display: 'inline-block'}}>
                                <b> {housingDetail.address.map((_, i) => <div key={id + '_address_' + i}>{capitalize(_)}</div>) }</b>
                            </div>
                        </Text>
                    </Col>
                    <Col n="6" className="fr-py-2w fr-px-3w">
                        <Title as="h2" look="h3">Historique du dossier</Title>
                    </Col>
                </Row>
            </Container>
            }
        </>
    );
};

export default HousingDetailView;

