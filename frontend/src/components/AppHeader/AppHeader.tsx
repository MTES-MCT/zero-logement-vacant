import React from 'react';
import { Header, HeaderBody, Logo, Service } from '@dataesr/react-dsfr';

function AppHeader() {
    return (
        <Header closeButtonLabel='Close it!'>
            <HeaderBody>
                <Logo splitCharacter={10}>République Française</Logo>
                <Service
                    title="Zéro Logement Vacant"
                    description="Faciliter la remobilisation des logements vacants par les collectivités"/>
            </HeaderBody>
        </Header>
    );
}

export default AppHeader;
