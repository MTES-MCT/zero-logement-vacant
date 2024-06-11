import Button from '@codegouvfr/react-dsfr/Button';
import {
  MainNavigation,
  MainNavigationProps,
} from '@codegouvfr/react-dsfr/MainNavigation';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import LoadingBar from 'react-redux-loading-bar';
import { Link, useLocation } from 'react-router-dom';

import { getUserNavItem, UserNavItems } from '../../models/UserNavItem';
import Collapse from '../Collapse/Collapse';
import { Container } from '../_dsfr';
import AccountSideMenu from '../../views/Account/AccountSideMenu';
import { useUser } from '../../hooks/useUser';
import styles from './small-header.module.scss';
import { changeEstablishment } from '../../store/actions/authenticationAction';
import EstablishmentSearchableSelect from '../EstablishmentSearchableSelect/EstablishmentSearchableSelect';
import { useAppDispatch } from '../../hooks/useStore';
import logo from '../../assets/images/zlv.svg';

function SmallHeader() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { displayName, establishment, isAdmin, isVisitor, isAuthenticated } = useUser();

  function getMainNavigationItem(
    navItem: UserNavItems,
  ): MainNavigationProps.Item {
    const link = getUserNavItem(navItem);
    return {
      linkProps: {
        to: link.url,
      },
      text: link.label,
      isActive: location.pathname.startsWith(link.url),
    };
  }

  return (
    <>
      <Paper
        className="fr-header"
        square
        sx={(theme) => ({
          position: 'sticky',
          zIndex: theme.zIndex.appBar,
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
              root: styles.root,
              list: styles.linkList,
              link: styles.link,
            }}
            items={
              isAuthenticated
                ? [
                    getMainNavigationItem(UserNavItems.HousingList),
                    getMainNavigationItem(UserNavItems.Campaign),
                    getMainNavigationItem(UserNavItems.Resources),
                  ]
                : []
            }
          />
          <Grid alignItems="center" display="flex" ml="auto">
            {isAuthenticated ? (
              (isAdmin || isVisitor) ? (
                <EstablishmentSearchableSelect
                  initialEstablishmentOption={
                    establishment
                      ? {
                          value: establishment.id,
                          label: establishment.name,
                        }
                      : undefined
                  }
                  onChange={(id: string) => {
                    dispatch(changeEstablishment(id));
                  }}
                />
              ) : (
                <Typography component="span" mr={2} variant="body2">
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
                  to: '/connexion',
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
