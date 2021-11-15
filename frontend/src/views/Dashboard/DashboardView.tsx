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
            <div className="bg-100">
                <Container spacing="py-4w mb-4w">
                    <Title as="h2">
                        Campagnes
                    </Title>
                    <div className="align-center">
                        <Link title="Accéder à la base de données" to="/logements" className="fr-btn--md fr-btn">
                            Créer une campagne
                        </Link>
                    </div>
                </Container>
            </div>
        </>
    );
};

export default DashboardView;

