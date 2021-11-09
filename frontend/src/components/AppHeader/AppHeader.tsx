import React, { useEffect, useState } from 'react';
import { Header, HeaderBody, HeaderNav, Logo, NavItem, Service } from '@dataesr/react-dsfr';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import LoadingBar from 'react-redux-loading-bar';
import styles from './app-header.module.scss';
import { getUserNavItem, UserNavItem, UserNavItems } from '../../models/UserNavItem';

function AppNavItem({ userNavItem } : {userNavItem: UserNavItem}) {

    const location = useLocation();
    const [path, setPath] = useState(() => location.pathname || '');

    useEffect(() => {
        if (path !== location.pathname) {
            setPath(location.pathname);
        }
    }, [path, setPath, location]);

    return (
        <NavItem
            current={path.indexOf(userNavItem.url) !== -1}
            title={userNavItem.label}
            asLink={<Link to={userNavItem.url}/>}
        />
    )
}

function AppHeader() {

    const { user } = useSelector((state: ApplicationState) => state.authentication);

    return (
        <>
            <Header closeButtonLabel='Close it!' data-testid="header">
                <HeaderBody>
                    <Logo splitCharacter={10}>Ministère de la transition écologique</Logo>
                    <Service
                        title="Zéro Logement Vacant"
                        description="Mobiliser les propriétaires de logements vacants"/>
                </HeaderBody>
                {user &&
                    <HeaderNav data-testid="header-nav">
                        <AppNavItem userNavItem={getUserNavItem(UserNavItems.Dashboard)} />
                        <AppNavItem userNavItem={getUserNavItem(UserNavItems.Campaign)} />
                        <AppNavItem userNavItem={getUserNavItem(UserNavItems.HousingList)} />
                    </HeaderNav>
                }
            </Header>
            <LoadingBar className={styles.loading} updateTime={10} maxProgress={100} progressIncrease={5}/>
        </>
    );
}

export default AppHeader;
