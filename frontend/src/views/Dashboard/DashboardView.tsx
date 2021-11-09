import React from 'react';
import { Container, Title } from '@dataesr/react-dsfr';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import { Link } from 'react-router-dom';


const DashboardView = () => {

    return (
        <>
            <Container spacing="py-4w mb-4w">
                <Title as="h1" className="fr-py-3w">
                    Bienvenue sur Zéro Logement Vacant
                </Title>
                <AppSearchBar onSearch={() => {}}
                              placeholder="Rechercher une adresse ou un propriétaire..."
                              size="lg"/>
                <Link title="Accéder à la base de données" to="/logements" className="ds-fr--inline fr-link float-right fr-pr-0 fr-py-3w">
                    Accéder à la base de données<span className="ri-1x icon-right ri-arrow-right-line ds-fr--v-middle" />
                </Link>
            </Container>
        </>
    );
};

export default DashboardView;

