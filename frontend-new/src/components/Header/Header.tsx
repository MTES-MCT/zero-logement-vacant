import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import LoadingBar from 'react-redux-loading-bar';
import styles from './header.module.scss';
import { getUserNavItem, UserNavItems } from '../../models/UserNavItem';
import { changeEstablishment } from '../../store/actions/authenticationAction';
import { useMatomo } from '@jonkoops/matomo-tracker-react';
import { useUser } from '../../hooks/useUser';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import EstablishmentSearchableSelect from '../EstablishmentSearchableSelect/EstablishmentSearchableSelect';
import { Header as DSFRHeader } from '@codegouvfr/react-dsfr/Header';
import AccountSideMenu from '../../views/Account/AccountSideMenu';
import Collapse from '../Collapse/Collapse';
import { Container } from '../_dsfr';

function Header() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { trackPageView } = useMatomo();
  const { isAdmin, isAuthenticated } = useUser();

  const { authUser } = useAppSelector((state) => state.authentication);

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

  const withNavItems = ['/'].includes(location.pathname);

  const getMainNavigationItem = (navItem: UserNavItems) => ({
    linkProps: {
      to: getUserNavItem(navItem).url,
      'data-testid': `fr-header-nav-item-${getUserNavItem(
        navItem,
      ).url.substring(1)}`,
    },
    text: getUserNavItem(navItem).label,
    isActive: location.pathname.startsWith(getUserNavItem(navItem).url),
  });

  return (
    <>
      <DSFRHeader
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
                  key="collapse-account"
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
                getMainNavigationItem(UserNavItems.Resources),
              ]
            : withNavItems && []
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
