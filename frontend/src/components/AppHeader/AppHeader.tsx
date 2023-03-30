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
import LoadingBar from 'react-redux-loading-bar';
import styles from './app-header.module.scss';
import {
  getUserNavItem,
  UserNavItem,
  UserNavItems,
} from '../../models/UserNavItem';
import {
  changeEstablishment,
  logout,
} from '../../store/actions/authenticationAction';
import AppActionsMenu, { MenuAction } from '../AppActionsMenu/AppActionsMenu';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import { useUser } from '../../hooks/useUser';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import EstablishmentSearchableSelect from '../EstablishmentSearchableSelect/EstablishmentSearchableSelect';

interface AppNavItemProps {
  userNavItem: UserNavItem;
  isCurrent?: () => boolean;
}

function AppNavItem({ userNavItem, isCurrent }: AppNavItemProps) {
  const location = useLocation();
  const [path, setPath] = useState(() => location.pathname || '');

  useEffect(() => {
    if (path !== location.pathname) {
      setPath(location.pathname);
    }
  }, [path, setPath, location]);

  return (
    <NavItem
      current={isCurrent ? isCurrent() : path.indexOf(userNavItem.url) !== -1}
      title={userNavItem.label}
      asLink={<Link to={userNavItem.url} className="d-md-none" />}
    />
  );
}

function AppHeader() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const history = useHistory();
  const { trackPageView } = useMatomo();
  const { isAdmin, isAuthenticated } = useUser();

  const { authUser } = useAppSelector((state) => state.authentication);

  useEffect(() => {
    trackPageView({});
  }, [location]); //eslint-disable-line react-hooks/exhaustive-deps

  const logoutUser = () => {
    dispatch(logout());
  };

  function displayName(): string {
    return authUser
      ? authUser.user.firstName && authUser.user.lastName
        ? `${authUser.user.firstName} ${authUser.user.lastName}`
        : authUser.user.email
      : '';
  }

  const menuActions = [
    {
      title: 'Modifier mon mot de passe',
      icon: 'ri-key-2-fill',
      onClick: () => history.push('/compte/mot-de-passe'),
    },
    {
      title: 'Me déconnecter',
      icon: 'ri-lock-line',
      onClick: () => logoutUser(),
    },
  ] as MenuAction[];

  const withNavItems =
    location.pathname === '/' ||
    location.pathname.indexOf('/collectivites') === 0 ||
    location.pathname.indexOf('/proprietaires') === 0;

  return (
    <>
      <Header closeButtonLabel="Fermer" data-testid="header">
        <HeaderBody>
          <Logo splitCharacter={10}>
            Ministère de la transition écologique et de la cohésion des
            territoires
          </Logo>
          <Service
            title="Zéro Logement Vacant"
            className={styles.brandService}
            description={
              isAuthenticated ? (
                isAdmin ? (
                  <EstablishmentSearchableSelect
                    initialEstablishmentId={authUser?.establishment.id}
                    onChange={(id: string) => {
                      if (id) {
                        dispatch(changeEstablishment(id));
                      }
                    }}
                  />
                ) : (
                  authUser?.establishment.name
                )
              ) : (
                ''
              )
            }
          />
          {isAuthenticated ? (
            <Tool>
              <ToolItemGroup>
                <ToolItem as="div">
                  <AppActionsMenu
                    actions={menuActions}
                    title={displayName()}
                    icon="ri-account-circle-line"
                    iconPosition="left"
                  />
                </ToolItem>
              </ToolItemGroup>
            </Tool>
          ) : (
            <Tool>
              <ToolItemGroup>
                <ToolItem
                  icon="ri-user-fill"
                  link="/connexion"
                  className="d-none d-lg-block fr-my-0"
                >
                  Connexion
                </ToolItem>
              </ToolItemGroup>
            </Tool>
          )}
        </HeaderBody>
        {isAuthenticated ? (
          <HeaderNav data-testid="header-nav">
            <AppNavItem userNavItem={getUserNavItem(UserNavItems.Dashboard)} />
            <AppNavItem userNavItem={getUserNavItem(UserNavItems.Campaign)} />
            <AppNavItem
              userNavItem={getUserNavItem(UserNavItems.HousingList)}
            />
            <AppNavItem userNavItem={getUserNavItem(UserNavItems.User)} />
            {isAdmin ? (
              <>
                <AppNavItem
                  userNavItem={getUserNavItem(UserNavItems.Monitoring)}
                />
              </>
            ) : (
              <AppNavItem
                userNavItem={getUserNavItem(
                  UserNavItems.EstablishmentMonitoring,
                  authUser?.establishment.id
                )}
              />
            )}
            <AppNavItem userNavItem={getUserNavItem(UserNavItems.Resources)} />
            <AppNavItem
              userNavItem={getUserNavItem(UserNavItems.Establishment)}
            />
          </HeaderNav>
        ) : (
          <HeaderNav>
            <div className="d-lg-none">
              <AppNavItem
                userNavItem={{
                  url: '/connexion',
                  label: 'Connexion',
                }}
              />
            </div>
            {withNavItems && (
              <AppNavItem
                userNavItem={getUserNavItem(UserNavItems.EstablishmentHome)}
                isCurrent={() =>
                  location.pathname === '/' ||
                  location.pathname.indexOf('/collectivites') === 0
                }
              />
            )}
            {withNavItems && (
              <AppNavItem
                userNavItem={getUserNavItem(UserNavItems.OwnerHome)}
              />
            )}
          </HeaderNav>
        )}
      </Header>
      <LoadingBar
        className={styles.loading}
        updateTime={10}
        maxProgress={100}
        progressIncrease={5}
      />
    </>
  );
}

export default AppHeader;
