import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import {
  MainNavigation,
  type MainNavigationProps
} from '@codegouvfr/react-dsfr/MainNavigation';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import LoadingBar from 'react-redux-loading-bar';
import { Link, useLocation } from 'react-router-dom';

import EstablishmentSearchableSelect from '~/components/establishment/EstablishmentSearchableSelect';
import logo from '../../assets/images/zlv.svg';
import { useFilters } from '../../hooks/useFilters';
import { useAppDispatch } from '../../hooks/useStore';
import { useUser } from '../../hooks/useUser';
import {
  type Establishment,
  fromEstablishmentDTO,
  toEstablishmentDTO
} from '../../models/Establishment';
import { getUserNavItem, UserNavItems } from '../../models/UserNavItem';
import { zlvApi } from '../../services/api.service';
import { changeEstablishment } from '../../store/actions/authenticationAction';
import AccountDropdown from '~/components/Account/AccountDropdown';
import styles from './small-header.module.scss';

function SmallHeader() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { establishment, isAdmin, isVisitor, isAuthenticated } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  function getMainNavigationItem(
    navItem: UserNavItems,
    options?: { showIcon?: boolean }
  ): MainNavigationProps.Item {
    const { showIcon = true } = options ?? {};
    const link = getUserNavItem(navItem);
    const item = {
      className: styles.mainNavigationItem,
      text: showIcon ? (
        <>
          <span
            className={`${link.icon} ${styles.icon}`}
            aria-hidden="true"
          ></span>
          {link.label}
        </>
      ) : (
        link.label
      ),
      isActive: location.pathname.startsWith(link.url)
    };
    const props = link.items?.length
      ? {
          menuLinks: link.items.map((item) => ({
            linkProps: { to: item.url },
            text: item.label
          }))
        }
      : {
          linkProps: {
            to: link.url
          }
        };

    return {
      ...item,
      ...props
    };
  }

  const { onResetFilters } = useFilters({ storage: 'store' });

  async function onChangeEstablishment(
    establishment: Establishment
  ): Promise<void> {
    await dispatch(changeEstablishment(establishment.id)).unwrap();
    // Reset all state instead of reloading the page
    dispatch(zlvApi.util.resetApiState());
    onResetFilters();
  }

  const navItems: MainNavigationProps.Item[] = isAuthenticated
    ? [
        getMainNavigationItem(UserNavItems.HousingList),
        getMainNavigationItem(UserNavItems.Analysis),
        getMainNavigationItem(UserNavItems.Campaign),
        getMainNavigationItem(UserNavItems.Resources)
      ]
    : [];

  const mobileNavItems: MainNavigationProps.Item[] = isAuthenticated
    ? [
        getMainNavigationItem(UserNavItems.HousingList, { showIcon: false }),
        getMainNavigationItem(UserNavItems.Analysis, { showIcon: false }),
        getMainNavigationItem(UserNavItems.Campaign, { showIcon: false }),
        getMainNavigationItem(UserNavItems.Resources, { showIcon: false })
      ]
    : [];

  return (
    <>
      <Paper
        className="fr-header"
        component="header"
        id="fr-header"
        square
        sx={(theme) => ({
          position: 'sticky',
          zIndex: theme.zIndex.appBar
        })}
      >
        <Grid
          alignItems="center"
          container
          px={3}
          sx={{ minHeight: '84px', flexWrap: 'nowrap' }}
        >
          {/* 1. Logo */}
          <Link
            className="fr-header-operator fr-enlarge-link fr-mr-5w"
            to="/"
            tabIndex={0}
          >
            <img
              className="fr-responsive-img-1x1"
              height={44}
              alt="Logo Zéro Logement Vacant"
              src={logo}
            />
          </Link>

          {/* 2. Inline nav: hidden at narrow viewports via CSS */}
          <MainNavigation
            className={`fr-mr-5w ${styles.mainNav}`}
            classes={{
              list: styles.linkList,
              link: styles.link
            }}
            items={navItems}
          />

          {/* Right-side items: establishment + menu + account (8px gap) */}
          <div className={styles.rightItems}>
            {/* Establishment info */}
            {isAuthenticated ? (
              isAdmin || isVisitor ? (
                establishment ? (
                  <EstablishmentSearchableSelect
                    disableClearable
                    value={toEstablishmentDTO(establishment)}
                    onChange={(establishment) => {
                      if (establishment) {
                        onChangeEstablishment(
                          fromEstablishmentDTO(establishment)
                        );
                      }
                    }}
                  />
                ) : null
              ) : (
                <Typography
                  className={styles.establishmentName}
                  component="span"
                  variant="body2"
                >
                  {establishment?.name}
                </Typography>
              )
            ) : null}

            {/* Burger button: visible only at narrow viewports */}
            {isAuthenticated && (
              <div className={styles.navbar}>
                <Button
                  iconId="fr-icon-menu-fill"
                  priority="tertiary"
                  size="small"
                  onClick={() => setMenuOpen(true)}
                  aria-expanded={menuOpen}
                >
                  Menu
                </Button>
              </div>
            )}

            {/* Account / Connexion */}
            {isAuthenticated ? (
              <AccountDropdown />
            ) : (
              <Button
                iconId="fr-icon-user-fill"
                linkProps={{
                  to: '/connexion'
                }}
                priority="tertiary no outline"
              >
                Connexion
              </Button>
            )}
          </div>
        </Grid>

        <LoadingBar
          className={styles.loading}
          updateTime={10}
          maxProgress={100}
          progressIncrease={5}
        />
      </Paper>

      {/* Mobile/zoom menu overlay */}
      {menuOpen && (
        <div
          className={styles.menuOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation"
        >
          <div className={styles.menuHeader}>
            <Button
              iconId="fr-icon-close-line"
              priority="tertiary no outline"
              size="small"
              onClick={() => setMenuOpen(false)}
              title="Fermer"
            >
              Fermer
            </Button>
          </div>
          <MainNavigation items={mobileNavItems} />
        </div>
      )}
    </>
  );
}

export default SmallHeader;
