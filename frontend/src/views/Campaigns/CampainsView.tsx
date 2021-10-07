import React, { useEffect } from 'react';
import { Col, Container, Row, Tab, Tabs, Text, Title } from '@dataesr/react-dsfr';
import { useDispatch } from 'react-redux';
import { searchCampaign } from '../../store/actions/campaignAction';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import styles from '../Owner/owner.module.scss';


const CampaignsView = () => {

    const dispatch = useDispatch();

    // const { campaignList } = useSelector((state: ApplicationState) => state.campaign);

    useEffect(() => {
        dispatch(searchCampaign(''));
    }, [dispatch])

    return (
        <>
            <div className={styles.titleContainer}>
                <Container spacing="py-4w">
                    <Row>
                        <Col>
                            <Title as="h1">Campagnes</Title>
                        </Col>
                        <Col>
                            <AppSearchBar onSearch={(input: string) => {dispatch(searchCampaign(input))}} />
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <Text size="md" className="fr-mb-1w"><b>Sélection</b></Text>
                            <Text size="md">Nom de la campagne</Text>
                        </Col>
                        <Col>
                            <Text size="md" className="fr-mb-1w"><b>Caractéristiques de la campagne</b></Text>
                        </Col>
                    </Row>
                </Container>
            </div>
            <Container spacing="py-4w">
                <Tabs>
                    <Tab label="À contacter">
                    </Tab>
                    <Tab label="En attente de retour">
                    </Tab>
                    <Tab label="Suivi en cours">
                    </Tab>
                    <Tab label="Sans suite">
                    </Tab>
                    <Tab label="Remis sur le marché">
                    </Tab>
                </Tabs>
            </Container>
        </>
    );
};

export default CampaignsView;

