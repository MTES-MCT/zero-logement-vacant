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
import { Link, useHistory, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import LoadingBar from 'react-redux-loading-bar';
import styles from './app-header.module.scss';
import { getUserNavItem, UserNavItem, UserNavItems } from '../../models/UserNavItem';
import { logout } from '../../store/actions/authenticationAction';

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

    const dispatch = useDispatch();
    const history = useHistory();

    const { authUser } = useSelector((state: ApplicationState) => state.authentication);

    const logoutUser = () => {
        dispatch(logout())
        history.push('/accueil');
    }

    return (
        <>
            <Header closeButtonLabel='Close it!' data-testid="header">
                <HeaderBody>
                    <Logo splitCharacter={10}>Ministère de la transition écologique</Logo>
                    <Service
                        title="Zéro Logement Vacant"
                        description={authUser ? authUser.user.establishment.name : ''}/>
                    {authUser &&
                    <Tool>
                        <ToolItemGroup>
                            <ToolItem icon='ri-lock-line' onClick={() => logoutUser()}>Me déconnecter</ToolItem>
                        </ToolItemGroup>
                    </Tool>
                    }
                </HeaderBody>
                {authUser &&
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
