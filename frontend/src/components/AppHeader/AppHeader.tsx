import React, { useEffect, useState } from 'react';
import { Header, HeaderBody, HeaderNav, Logo, NavItem, Service } from '@dataesr/react-dsfr';
import { Link, useLocation } from 'react-router-dom';


function AppHeader() {

    const location = useLocation();
    const [path, setPath] = useState(() => location.pathname || '');

    useEffect(() => {
        if (path !== location.pathname) {
            setPath(location.pathname);
        }
    }, [path, setPath, location]);

    return (
        <Header closeButtonLabel='Close it!' data-testid="header">
            <HeaderBody>
                <Logo splitCharacter={10}>Ministère de la transition écologique</Logo>
                <Service
                    title="Zéro Logement Vacant"
                    description="Mobiliser les propriétaires de logements vacants"/>
            </HeaderBody>
            <HeaderNav>
                <NavItem
                    current={path === '/logements'}
                    title="Logements"
                    asLink={<Link to="/logements" />}
                />
                <NavItem
                    current={path === '/campagnes'}
                    title="Campagnes"
                    asLink={<Link to="/campagnes" />}
                />
                <NavItem
                    current={path === '/stats'}
                    title="Statistiques"
                    asLink={<Link to="/stats" />}
                />
            </HeaderNav>
        </Header>
    );
}

export default AppHeader;
