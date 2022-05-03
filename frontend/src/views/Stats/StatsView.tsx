import React from 'react';
import { Col, Container, Row, Title } from '@dataesr/react-dsfr';


const StatsView = () => {

    return (
        <>
            <Container spacing="py-4w mb-4w">
                <Title as="h1">
                    Statistiques
                </Title>
                <Row>
                    <Col>
                        <Title as="h2" look="h4">
                            Nombre de propriétaires contactés
                        </Title>
                    </Col>
                    <Col>
                        <Title as="h2" look="h4">
                            Situations en cours de modifications
                        </Title>
                    </Col>
                </Row>
            </Container>
        </>
    );
};

export default StatsView;

