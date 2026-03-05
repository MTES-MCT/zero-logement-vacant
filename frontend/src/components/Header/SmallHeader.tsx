import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import {
  MainNavigation,
  type MainNavigationProps
} from '@codegouvfr/react-dsfr/MainNavigation';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
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

const MenuOverlay = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: theme.zIndex.modal,
  backgroundColor: fr.colors.decisions.background.default.grey.default,
  overflowY: 'auto',
  padding: '1rem 1.5rem'
}));

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

          {/* 2. Inline nav: hidden at narrow viewports (RGAA 10.4) */}
          <Box
            className="fr-mr-5w"
            sx={{
              [fr.breakpoints.down('lg')]: { display: 'none !important' }
            }}
          >
            <MainNavigation
              classes={{
                list: styles.linkList,
                link: styles.link
              }}
              items={navItems}
            />
          </Box>

          {/* Right-side items: establishment + menu + account */}
          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              gap: '0.5rem',
              ml: 'auto',
              flexShrink: 0
            }}
          >
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
                  component="p"
                  mr={2}
                  variant="body2"
                  sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}
                >
                  {establishment?.name}
                </Typography>
              )
            ) : null}

            {/* Burger button: visible only at narrow viewports (RGAA 10.4) */}
            {isAuthenticated && (
              <Box
                sx={{
                  display: 'none',
                  alignItems: 'center',
                  flexShrink: 0,
                  [fr.breakpoints.down('lg')]: { display: 'flex' }
                }}
              >
                <Button
                  iconId="fr-icon-menu-fill"
                  priority="tertiary"
                  size="small"
                  onClick={() => setMenuOpen(true)}
                  title="Ouvrir le menu"
                  nativeButtonProps={{
                    'aria-label': 'Ouvrir le menu',
                    'aria-expanded': menuOpen
                  }}
                >
                  Menu
                </Button>
              </Box>
            )}

            {/* Account / Connexion */}
            {isAuthenticated ? (
              <nav aria-label="Navigation du compte utilisateur">
                <AccountDropdown />
              </nav>
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
          </Stack>
        </Grid>

        <LoadingBar
          className={styles.loading}
          updateTime={10}
          maxProgress={100}
          progressIncrease={5}
        />
      </Paper>

      {/* Mobile/zoom menu overlay (RGAA 10.4) */}
      {menuOpen && (
        <MenuOverlay
          component="nav"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation"
        >
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: '1rem' }}>
            <Button
              iconId="fr-icon-close-line"
              priority="tertiary no outline"
              size="small"
              onClick={() => setMenuOpen(false)}
              title="Fermer le menu"
              nativeButtonProps={{
                'aria-label': 'Fermer le menu'
              }}
            >
              Fermer
            </Button>
          </Box>
          <MainNavigation items={mobileNavItems} />
        </MenuOverlay>
      )}
    </>
  );
}

export default SmallHeader;
