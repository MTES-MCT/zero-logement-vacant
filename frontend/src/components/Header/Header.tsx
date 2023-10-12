import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import LoadingBar from 'react-redux-loading-bar';
import styles from './header.module.scss';
import { getUserNavItem, UserNavItems } from '../../models/UserNavItem';
import { changeEstablishment } from '../../store/actions/authenticationAction';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import { useUser } from '../../hooks/useUser';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import { findOwnerProspects } from '../../store/actions/ownerProspectAction';
import EstablishmentSearchableSelect from '../EstablishmentSearchableSelect/EstablishmentSearchableSelect';
import { Header } from '@codegouvfr/react-dsfr/Header';
import VerticalLink from '../VerticalLink/VerticalLink';
import AccountSideMenu from '../../views/Account/AccountSideMenu';
import Collapse from '../Collapse/Collapse';
import { Container } from '../_dsfr';

function Header() {
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

  const withNavItems = ['/', '/collectivites', '/proprietaires'].includes(
    location.pathname
  );

  const getMainNavigationItem = (navItem: UserNavItems) => ({
    linkProps: {
      to: getUserNavItem(navItem).url,
      'data-TestId': `fr-header-nav-item-${getUserNavItem(
        navItem
      ).url.substring(1)}`,
    },
    text: getUserNavItem(navItem).label,
    isActive: location.pathname.indexOf(getUserNavItem(navItem).url) !== -1,
  });

  return (
    <>
      <Header
        brandTop={
          <>
            Ministère de <br />
            la transition <br />
            écologique <br />
            et de la cohésion <br />
            des territoires
          </>
        }
        homeLinkProps={{
          to: '/',
          title: 'Accueil - Zéro Logement Vacant',
        }}
        serviceTitle="Zéro Logement Vacant"
        serviceTagline={
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
        quickAccessItems={
          isAuthenticated
            ? [
                <Collapse
                  icon="fr-icon-user-fill"
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
                />,
                <div className="fr-ml-2w">
                  <VerticalLink
                    badge={unreadMessages?.length}
                    current={location.pathname === '/messagerie'}
                    icon="fr-icon-mail-fill"
                    label="Messagerie"
                    to="/messagerie"
                  />
                </div>,
                <div className="fr-ml-2w">
                  <VerticalLink
                    current={location.pathname === '/ressources'}
                    icon="fr-icon-question-fill"
                    label="Ressources"
                    to="/ressources"
                  />
                </div>,
              ]
            : [
                {
                  iconId: 'fr-icon-user-fill',
                  linkProps: {
                    to: '/connexion',
                  },
                  text: 'Connexion',
                },
              ]
        }
        navigation={
          isAuthenticated
            ? [
                getMainNavigationItem(UserNavItems.HousingList),
                getMainNavigationItem(UserNavItems.Campaign),
                getMainNavigationItem(UserNavItems.Establishment),
              ]
            : withNavItems && [
                {
                  linkProps: {
                    to: getUserNavItem(UserNavItems.EstablishmentHome).url,
                  },
                  text: getUserNavItem(UserNavItems.EstablishmentHome).label,
                  isActive:
                    location.pathname === '/' ||
                    location.pathname.indexOf('/collectivites') === 0,
                },
                {
                  linkProps: {
                    to: getUserNavItem(UserNavItems.OwnerHome).url,
                  },
                  text: getUserNavItem(UserNavItems.OwnerHome).label,
                  isActive: location.pathname.indexOf('/proprietaires') === 0,
                },
              ]
        }
        data-testid="header"
      />
      <LoadingBar
        className={styles.loading}
        updateTime={10}
        maxProgress={100}
        progressIncrease={5}
      />
    </>
  );
}

export default Header;
