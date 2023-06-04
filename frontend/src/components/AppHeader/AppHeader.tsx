import React, { useEffect, useState } from 'react';
import {
  Container,
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
import { Link, useLocation } from 'react-router-dom';
import LoadingBar from 'react-redux-loading-bar';
import styles from './app-header.module.scss';
import {
  getUserNavItem,
  UserNavItem,
  UserNavItems,
} from '../../models/UserNavItem';
import { changeEstablishment } from '../../store/actions/authenticationAction';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import { useUser } from '../../hooks/useUser';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import { findOwnerProspects } from '../../store/actions/ownerProspectAction';
import EstablishmentSearchableSelect from '../EstablishmentSearchableSelect/EstablishmentSearchableSelect';
import VerticalLink from '../VerticalLink/VerticalLink';
import Collapse from '../Collapse/Collapse';
import AccountSideMenu from '../../views/Account/AccountSideMenu';

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

  function displayName(): string {
    return authUser
      ? authUser.user.firstName && authUser.user.lastName
        ? `${authUser.user.firstName} ${authUser.user.lastName}`
        : authUser.user.email
      : '';
  }

  const withNavItems = ['/', '/collectivites', 'proprietaires'].includes(
    location.pathname
  );

  return (
    <>
      <Header
        closeButtonLabel="Fermer"
        data-testid="header"
        className={styles.header}
      >
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
                <ToolItem as="div" className="fr-ml-2w">
                  <Collapse
                    icon="ri-user-fill"
                    dropdown
                    title={displayName()}
                    content={
                      <Container
                        className="bg-white bordered"
                        spacing="px-2w pt-1w pb-2w"
                        fluid
                      >
                        <AccountSideMenu />
                      </Container>
                    }
                  />
                </ToolItem>
                <ToolItem as="div" className="fr-ml-2w">
                  <VerticalLink
                    badge={unreadMessages?.length}
                    current={location.pathname === '/messagerie'}
                    icon="ri-mail-fill"
                    label="Messagerie"
                    to="/messagerie"
                  />
                </ToolItem>
                <ToolItem as="div" className="fr-ml-2w">
                  <VerticalLink
                    current={location.pathname === '/ressources'}
                    icon="ri-question-fill"
                    label="Ressources"
                    to="/ressources"
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
            <AppNavItem
              userNavItem={getUserNavItem(UserNavItems.HousingList)}
            />
            <AppNavItem userNavItem={getUserNavItem(UserNavItems.Campaign)} />
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
              <>
                <AppNavItem
                  userNavItem={getUserNavItem(UserNavItems.EstablishmentHome)}
                  isCurrent={() =>
                    location.pathname === '/' ||
                    location.pathname.indexOf('/collectivites') === 0
                  }
                />
                <AppNavItem
                  userNavItem={getUserNavItem(UserNavItems.OwnerHome)}
                />
              </>
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
