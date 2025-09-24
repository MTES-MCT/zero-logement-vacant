import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import {
  MainNavigation,
  type MainNavigationProps
} from '@codegouvfr/react-dsfr/MainNavigation';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import LoadingBar from 'react-redux-loading-bar';
import { Link, useLocation } from 'react-router-dom';

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
import AccountSideMenu from '../../views/Account/AccountSideMenu';
import { Container } from '../_dsfr';
import Collapse from '../Collapse/Collapse';
import EstablishmentSearchableSelect from '~/components/establishment/EstablishmentSearchableSelect';
import styles from './small-header.module.scss';

function SmallHeader() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { displayName, establishment, isAdmin, isVisitor, isAuthenticated } =
    useUser();

  function getMainNavigationItem(
    navItem: UserNavItems
  ): MainNavigationProps.Item {
    const link = getUserNavItem(navItem);
    const item = {
      className: styles.mainNavigationItem,
      text: (
        <>
          <span
            className={`${link.icon} ${styles.icon}`}
            aria-hidden="true"
          ></span>
          {link.label}
        </>
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

  return (
    <>
      <Paper
        className="fr-header"
        square
        sx={(theme) => ({
          position: 'sticky',
          zIndex: theme.zIndex.appBar
        })}
      >
        <Grid
          alignItems="center"
          container
          component="header"
          px={3}
          sx={{ height: '84px' }}
        >
          <Link className="fr-header-operator fr-enlarge-link fr-mr-5w" to="/">
            <img
              className="fr-responsive-img-1x1"
              height={44}
              alt="Logo Zéro Logement Vacant"
              src={logo}
            />
          </Link>

          <MainNavigation
            className="fr-mr-5w"
            classes={{
              //root: styles.root,
              list: styles.linkList,
              link: styles.link
            }}
            items={
              isAuthenticated
                ? [
                    getMainNavigationItem(UserNavItems.HousingList),
                    getMainNavigationItem(UserNavItems.Analysis),
                    getMainNavigationItem(UserNavItems.Campaign),
                    getMainNavigationItem(UserNavItems.Resources)
                  ]
                : []
            }
          />
          <Grid alignItems="center" display="flex" ml="auto">
            {isAuthenticated ? (
              isAdmin || isVisitor ? (
                establishment ? (
                  <EstablishmentSearchableSelect
                    className={fr.cx('fr-mr-2w')}
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
                  mr={2}
                  variant="body2"
                >
                  {establishment?.name}
                </Typography>
              )
            ) : null}

            {isAuthenticated ? (
              <Collapse
                icon="fr-icon-user-fill"
                dropdown
                title={displayName()}
                content={
                  <Container
                    as="header"
                    className="bg-white bordered"
                    spacing="px-2w pt-1w pb-2w"
                    fluid
                  >
                    <AccountSideMenu />
                  </Container>
                }
              />
            ) : (
              <Button
                iconId="fr-icon-user-fill"
                linkProps={{
                  to: '/connexion'
                }}
                priority="tertiary no outline"
                size="small"
              >
                Connexion
              </Button>
            )}
          </Grid>
        </Grid>

        <LoadingBar
          className={styles.loading}
          updateTime={10}
          maxProgress={100}
          progressIncrease={5}
        />
      </Paper>
    </>
  );
}

export default SmallHeader;
