import { PopupButton } from '@typeform/embed-react'
import { Col, Container, Row, Text, Title } from '@dataesr/react-dsfr';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import building from '../../assets/images/building.svg';
import new_message from '../../assets/images/new_message.svg';
import people_search from '../../assets/images/people_search.svg';
import sync_files from '../../assets/images/sync_files.svg';

import styles from '../Home/home.module.scss';




const ProprietaireView = () => {

    const { trackEvent } = useMatomo();

    return (
        <>
            <Container spacing="py-7w mb-4w">
                <Row gutters>
                    <Col>
                        <Title as="h1" look="h4">
                            Vous êtes propriétaire d'un logement vacant ?
                        </Title>
                        <Title as="h2" look="h1">
                            Faites vous aidez par votre ville pour remettre rapidement votre logement en location
                        </Title>
                        <PopupButton id="w8YB8XMQ" style={{ fontSize: 20 }} className="fr-btn--md fr-btn">
                            Inscription
                        </PopupButton>
                        <Text size="lead" className="fr-py-4w">
                            Profitez gratuitement d'un accompagnement et bénéficiez dans certains cas d'aides financières
                        </Text>

                    </Col>
                    <Col className="align-right">
                        <img src={building} style={{ maxWidth: "100%", height: "100%" }} alt="" />
                    </Col>
                </Row>
            </Container>
            <div className="bg-bf975">
                <Container spacing="py-7w mb-4w">
                    <Row>
                        <Col>
                            <Title as="h2" look="h4">
                                Concrètement, comment ça fonctionne ?
                            </Title>
                        </Col>
                    </Row>
                    <Row gutters>
                        <Col>
                            <div>
                                <img src={people_search} height="100%" alt="" />
                            </div>
                            <Text size="lg">
                                Inscrivez-vous en 2 minutes sur notre site, c'est gratuit et sans engagement de votre part
                            </Text>
                        </Col>
                        <Col>
                            <div>
                                <img src={new_message} height="100%" alt="" />
                            </div>
                            <Text size="lg">
                                Si votre logement est situé dans une ville qui utilise notre service, nous vous mettons en relation
                            </Text>
                        </Col>
                        <Col>
                            <div>
                                <img src={sync_files} height="100%" alt="" />
                            </div>
                            <Text size="lg">
                                Vous êtes recontacté par votre ville pour être accompagné et bénéficier le cas échéant d'aides financières
                            </Text>
                        </Col>
                    </Row>
                </Container>
            </div>



        </>
    );
};

export default ProprietaireView;

