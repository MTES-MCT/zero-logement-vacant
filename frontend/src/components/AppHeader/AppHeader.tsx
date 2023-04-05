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
import { findOwnerProspects } from '../../store/actions/ownerProspectAction';
import EstablishmentSearchableSelect from '../EstablishmentSearchableSelect/EstablishmentSearchableSelect';

interface AppNavItemProps {
  userNavItem: UserNavItem;
  isCurrent?: () => boolean;
  count?: number;
}

function AppNavItem({ userNavItem, isCurrent, count }: AppNavItemProps) {
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
      asLink={
        count ? (
          <Link to={userNavItem.url} className="d-md-none">
            {userNavItem.label}
            <span className={styles.count}>{count}</span>
          </Link>
        ) : (
          <Link to={userNavItem.url} className="d-md-none" />
        )
      }
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
  const { ownerProspects } = useAppSelector((state) => state.ownerProspect);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(findOwnerProspects());
    }
  }, [dispatch, isAuthenticated]);

  const unreadMessages = ownerProspects?.entities?.filter(
    (entity) => !entity.read
  );

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
    location.pathname === '/collectivites' ||
    location.pathname === '/proprietaires';

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
                    initialEstablishmentOption={
                      authUser
                        ? {
                            value: authUser.establishment.id,
                            label: authUser.establishment.name,
                          }
                        : undefined
                    }
                    onChange={(id: string) => {
                      dispatch(changeEstablishment(id));
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
            <AppNavItem
              userNavItem={getUserNavItem(UserNavItems.Inbox)}
              count={unreadMessages?.length}
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
