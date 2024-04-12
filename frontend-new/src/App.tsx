import { useMatomo } from '@jonkoops/matomo-tracker-react';
import React, { useEffect } from 'react';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import {
  BrowserRouter,
  Redirect,
  Route,
  RouteProps,
  Switch,
} from 'react-router-dom';

import Header from './components/Header/Header';
import LoginView from './views/Login/LoginView';
import HousingListView from './views/HousingList/HousingListView';
import FetchInterceptor from './components/FetchInterceptor/FetchInterceptor';
import OwnerView from './views/Owner/OwnerView';
import CampaignsListView from './views/Campaign/CampainListView';
import CampaignView from './views/Campaign/CampaignView';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';
import AccountPasswordView from './views/Account/AccountPasswordView';
import StatsView from './views/Stats/StatsView';
import HousingView from './views/Housing/HousingView';
import AccessibilityView from './views/Accessibility/AccessibilityView';
import ResourcesView from './views/Resources/ResourcesView';
import AccountCreationView from './views/Account/AccountCreationView';
import ForgottenPasswordView from './views/Account/ForgottenPasswordView';
import ResetPasswordView from './views/Account/ResetPasswordView';
import { useUser } from './hooks/useUser';
import EstablishmentHomeView from './views/Home/EstablishmentHomeView';
import { useAppDispatch, useAppSelector } from './hooks/useStore';
import StatusView from './views/Resources/StatusView';
import LegalNoticesView from './views/LegalNotices/LegalNoticesView';
import AccountView from './views/Account/AccountView';
import GroupView from './views/Group/GroupView';
import UsersView from './views/Users/UsersView';
import TerritoryEstablishmentsView from './views/TerritoryEstablishments/TerritoryEstablishmentsView';
import './App.scss';

function App() {
  const { pushInstruction } = useMatomo();
  const { isAuthenticated, user } = useUser();
  const { isLoggedOut } = useAppSelector((state) => state.authentication);
  const dispatch = useAppDispatch();
  const isSomeQueryPending = useAppSelector((state) =>
    Object.values(state.api.queries).some(
      (query) => query?.status === 'pending',
    ),
  );

  FetchInterceptor();

  useEffect(() => {
    pushInstruction('setUserId', user?.id);
  }, [pushInstruction, user]);

  useEffect(() => {
    if (isSomeQueryPending) {
      dispatch(showLoading());
    } else {
      dispatch(hideLoading());
    }
  }, [dispatch, isSomeQueryPending]);

  return (
    <React.Suspense fallback={<></>}>
      <BrowserRouter>
        <Header />
        <ScrollToTop />

        <Switch>
          <Route>
            <Route path="/stats" component={StatsView} />
            <Route path="/accessibilite" component={AccessibilityView} />
            <Route path="/mentions-legales" component={LegalNoticesView} />,
            {isAuthenticated
              ? [
                  ...[
                    {
                      path: '/parc-de-logements',
                      component: HousingListView,
                    },
                    {
                      path: '/parc-de-logements/campagnes/:campaignId',
                      component: CampaignView,
                    },
                    { path: '/groupes/:id', component: GroupView },
                    { path: '/campagnes', component: CampaignsListView },
                    {
                      path: '/campagnes/:campaignId',
                      component: CampaignView,
                    },
                    {
                      path: '/proprietaires/:ownerId/logements/:housingId',
                      component: HousingView,
                    },
                    {
                      path: '/proprietaires/:ownerId',
                      component: OwnerView,
                    },
                    {
                      path: '/logements/:housingId/proprietaires/:ownerId',
                      component: OwnerView,
                    },
                    {
                      path: '/logements/:housingId',
                      component: HousingView,
                    },
                    {
                      path: '/ressources/statuts',
                      component: StatusView,
                    },
                    { path: '/ressources', component: ResourcesView },
                    { path: '/compte', component: AccountView },
                    {
                      path: '/compte/mot-de-passe',
                      component: AccountPasswordView,
                    },
                    { path: '/utilisateurs', component: UsersView },
                    {
                      path: '/autres-etablissements',
                      component: TerritoryEstablishmentsView,
                    },
                  ].map((route: RouteProps) => (
                    <Route
                      path={route.path}
                      exact
                      component={route.component}
                      key={`route_${route.path}`}
                    />
                  )),
                  <Route path="/*" key="route_default">
                    <Redirect to="/parc-de-logements" />
                  </Route>,
                ]
              : [
                  ...[
                    {
                      path: '/inscription*',
                      component: AccountCreationView,
                    },
                    { path: '/connexion', component: LoginView },
                    {
                      path: '/mot-de-passe/oublie',
                      component: ForgottenPasswordView,
                    },
                    {
                      path: '/mot-de-passe/nouveau',
                      component: ResetPasswordView,
                    },
                    { path: '/admin', component: LoginView },
                    { path: '/', component: EstablishmentHomeView },
                  ].map((route) => (
                    <Route
                      exact
                      path={route.path}
                      component={route.component}
                      key={`route_${route.path}`}
                    />
                  )),
                  <Route path="/*" key="route_default">
                    {isLoggedOut ? (
                      <Redirect to="/connexion" />
                    ) : (
                      <Redirect to="/" />
                    )}
                  </Route>,
                ]}
          </Route>
        </Switch>
      </BrowserRouter>
    </React.Suspense>
  );
}

export default App;
