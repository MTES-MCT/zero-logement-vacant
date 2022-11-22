import React from 'react';
import { Container, Title } from '@dataesr/react-dsfr';
import { Widget } from '@typeform/embed-react'




const ProprietaireView = () => {

    return (
        <Container spacing="py-4w mb-4w">
            <Title as="h1">
                Vous êtes proprietaire d'un logement vacant?
            </Title>
            <Title as="h2">
                Faites vous accompagné par votre ville pour bénéficer d'aides et remettre rapidement votre logement en location
            </Title>
            <Widget id="w8YB8XMQ" style={{ width: '100%' }} className="my-form" />
        </Container>
    );
};

export default ProprietaireView;

