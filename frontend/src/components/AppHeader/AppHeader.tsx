import React from 'react';
import { Header, HeaderBody, Logo, Service } from '@dataesr/react-dsfr';

function AppHeader() {
    return (
        <Header closeButtonLabel='Close it!' data-testid="header">
            <HeaderBody>
                <Logo splitCharacter={10}>République Française</Logo>
                <Service
                    title="Zéro Logement Vacant"
                    description="Mobiliser les propriétaires de logements vacants"/>
            </HeaderBody>
        </Header>
    );
}

export default AppHeader;
