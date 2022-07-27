import React, { useEffect, useState } from 'react';
import {
    Header,
    HeaderBody,
    HeaderNav,
    Logo,
    NavItem,
    Service,
    Tool,
    ToolItem,
    ToolItemGroup,
} from '@dataesr/react-dsfr';
import { useHistory, useLocation, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import LoadingBar from 'react-redux-loading-bar';
import styles from './app-header.module.scss';
import { getUserNavItem, UserNavItem, UserNavItems } from '../../models/UserNavItem';
import { logout } from '../../store/actions/authenticationAction';
import { isValidUser, UserRoles } from '../../models/User';
import AppActionsMenu, { MenuAction } from '../AppActionsMenu/AppActionsMenu';

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
            asLink={<Link to={userNavItem.url} className="d-md-none"/>}
        />
    )
}

function AppHeader() {

    const dispatch = useDispatch();
    const history = useHistory();

    const { authUser } = useSelector((state: ApplicationState) => state.authentication);

    const logoutUser = () => {
        dispatch(logout())
        history.push('/accueil');
    }

    const menuActions = [
        { title: 'Modifier mon mot de passe', icon: 'ri-key-2-fill', onClick: () => history.push('/compte/mot-de-passe')},
        { title: 'Me déconnecter', icon: 'ri-lock-line', onClick: () => logoutUser()}
    ] as MenuAction[]

    return (
        <>
            <Header closeButtonLabel='Fermer' data-testid="header">
                <HeaderBody>
                    <Logo splitCharacter={10}>Ministère de la transition écologique et de la cohésion des territoires</Logo>
                    <Service
                        title="Zéro Logement Vacant"
                        description={isValidUser(authUser) ? authUser.establishment.name : ''}/>
                    {isValidUser(authUser) ?
                        <Tool>
                            <ToolItemGroup>
                                <ToolItem>
                                    <AppActionsMenu
                                        actions={menuActions}
                                        title={`${authUser.user.firstName} ${authUser.user.lastName}`}
                                        icon="ri-account-circle-line"
                                        iconPosition="left"/>
                                </ToolItem>
                            </ToolItemGroup>
                        </Tool> :
                        <Tool>
                            <ToolItemGroup>
                                <ToolItem icon="ri-user-fill" link="/connexion" className="d-none d-lg-block">Connexion</ToolItem>
                            </ToolItemGroup>
                        </Tool>
                    }
                </HeaderBody>
                {isValidUser(authUser) ?
                    <HeaderNav data-testid="header-nav">
                        <AppNavItem userNavItem={getUserNavItem(UserNavItems.Dashboard)} />
                        <AppNavItem userNavItem={getUserNavItem(UserNavItems.Campaign)} />
                        <AppNavItem userNavItem={getUserNavItem(UserNavItems.HousingList)} />
                        {authUser.user.role === UserRoles.Admin ? <>
                            <AppNavItem userNavItem={getUserNavItem(UserNavItems.User)} />
                            <AppNavItem userNavItem={getUserNavItem(UserNavItems.Monitoring)} />
                        </> :
                            <AppNavItem userNavItem={getUserNavItem(UserNavItems.EstablishmentMonitoring, authUser.establishment.id)} />
                        }
                    </HeaderNav> :
                    <HeaderNav className="d-lg-none">
                        <AppNavItem userNavItem={{url: '/connexion', label: 'Connexion'}} />
                    </HeaderNav>
                }
            </Header>
            <LoadingBar className={styles.loading} updateTime={10} maxProgress={100} progressIncrease={5}/>
        </>
    );
}

export default AppHeader;
