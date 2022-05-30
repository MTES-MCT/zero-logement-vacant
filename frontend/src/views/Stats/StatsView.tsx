import React, { useEffect } from 'react';
import { Card, CardDescription, CardTitle, Col, Container, Row, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { getContactedOwnersCount } from '../../store/actions/statisticAction';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import styles from './stats.module.scss';


const StatsView = () => {

    const dispatch = useDispatch();

    const { establishmentCount, contactedHousingCount, waitingHousingCount, answersCount, housingFollowedCount, housingFirstContactedCount, housingOutOfVacancyCount } = useSelector((state: ApplicationState) => state.statistic);


    useEffect(() => {
        dispatch(getContactedOwnersCount());
    }, [dispatch])

    return (
        <>
            <Container spacing="py-4w mb-4w">
                <Title as="h1">
                    Statistiques
                </Title>
                <Row gutters>
                    <Col n="4">
                        <Card hasArrow={false}>
                            <CardTitle>
                                <span>Nombre de structures utilisatrices</span>
                            </CardTitle>
                            <CardDescription className={styles.stats_value}>
                                <span>{establishmentCount ?? '...'}</span>
                            </CardDescription>
                        </Card>
                    </Col>
                </Row>
                <Row gutters>
                    <Col n="4">
                        <Card hasArrow={false}>
                            <CardTitle>
                                <span>Nombre de logements contactés</span>
                            </CardTitle>
                            <CardDescription className={styles.stats_value}>
                                <span>{contactedHousingCount ?? '...'}</span>
                            </CardDescription>
                        </Card>
                    </Col>
                    <Col n="4">
                        <Card hasArrow={false}>
                            <CardTitle>
                                <span>Nombre de logements en attente de retour</span>
                            </CardTitle>
                            <CardDescription className={styles.stats_value}>
                                <span>{waitingHousingCount ?? '...'}</span>
                            </CardDescription>
                        </Card>
                    </Col>
                    <Col n="4">
                        <Card hasArrow={false}>
                            <CardTitle>
                                <span>Nombre de réponses</span>
                            </CardTitle>
                            <CardDescription className={styles.stats_value}>
                                <span>{answersCount ?? '...'}</span>
                            </CardDescription>
                        </Card>
                    </Col>
                </Row>
                <Row gutters>
                    <Col>
                        <Card hasArrow={false}>
                            <CardTitle>
                                <span>Nombre de premiers contacts</span>
                            </CardTitle>
                            <CardDescription className={styles.stats_value}>
                                <span>{housingFirstContactedCount ?? '...'}</span>
                            </CardDescription>
                        </Card>
                    </Col>
                    <Col>
                        <Card hasArrow={false}>
                            <CardTitle>
                                <span>Nombre de logements suivis par les collectivités</span>
                            </CardTitle>
                            <CardDescription className={styles.stats_value}>
                                <span>{housingFollowedCount ?? '...'}</span>
                            </CardDescription>
                        </Card>
                    </Col>
                    <Col>
                        <Card hasArrow={false}>
                            <CardTitle>
                                <span>Nombre de logements sortis de la vacance</span>
                            </CardTitle>
                            <CardDescription className={styles.stats_value}>
                                <span>{housingOutOfVacancyCount ?? '...'}</span>
                            </CardDescription>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </>
    );
};

export default StatsView;

