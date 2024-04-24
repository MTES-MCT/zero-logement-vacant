import {
  MainNavigation,
  MainNavigationProps,
} from '@codegouvfr/react-dsfr/MainNavigation';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Unstable_Grid2';
import React from 'react';
import { useLocation } from 'react-router-dom';

import { getUserNavItem, UserNavItems } from '../../models/UserNavItem';
import Collapse from '../Collapse/Collapse';
import { Container } from '../_dsfr';
import AccountSideMenu from '../../views/Account/AccountSideMenu';
import { useAppSelector } from '../../hooks/useStore';
import { useUser } from '../../hooks/useUser';

function SmallHeader() {
  const { displayName, isAdmin, isAuthenticated } = useUser();
  const location = useLocation();
  function getMainNavigationItem(
    navItem: UserNavItems
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
    <Paper
      elevation={2}
      square
      sx={(theme) => ({
        zIndex: 1750,
      })}
    >
      <Grid
        alignItems="center"
        container
        component="header"
        justifyContent="space-between"
        px={3}
      >
        <MainNavigation
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
        <Grid alignItems="center">
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
        </Grid>
      </Grid>
    </Paper>
  );
}

export default SmallHeader;
