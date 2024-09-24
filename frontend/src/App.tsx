import { useMatomo } from '@jonkoops/matomo-tracker-react';
import React, { useEffect } from 'react';
import { hideLoading, showLoading } from 'react-redux-loading-bar';
import {
  BrowserRouter,
  Redirect,
  Route,
  RouteProps,
  Switch
} from 'react-router-dom';

import './App.scss';
import Footer from './components/Footer/Footer';
import LoginView from './views/Login/LoginView';
import HousingListView from './views/HousingList/HousingListView';
import FetchInterceptor from './components/FetchInterceptor/FetchInterceptor';
import OwnerView from './views/Owner/OwnerView';
import CampaignsListView from './views/Campaign/CampaignListView';
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
import SmallHeader from './components/Header/SmallHeader';
import Header from './components/Header/Header';

const publicRoutes: RouteProps[] = [
  { path: '/stats', component: StatsView },
  { path: '/accessibilite', component: AccessibilityView },
  { path: '/mentions-legales', component: LegalNoticesView }
];
const authenticatedRoutes: RouteProps[] = [
  {
    path: '/parc-de-logements',
    component: HousingListView
  },
  // TODO: remove this
  { path: '/parc-de-logements/campagnes/:id', component: CampaignView },
  { path: '/groupes/:id', component: GroupView },
  { path: '/campagnes', component: CampaignsListView },
  { path: '/campagnes/:id', component: CampaignView },
  {
    path: '/proprietaires/:ownerId/logements/:housingId',
    component: HousingView
  },
  { path: '/proprietaires/:ownerId', component: OwnerView },
  {
    path: '/logements/:housingId/proprietaires/:ownerId',
    component: OwnerView
  },
  { path: '/logements/:housingId', component: HousingView },
  { path: '/ressources/statuts', component: StatusView },
  { path: '/ressources', component: ResourcesView },

  { path: '/compte', component: AccountView },
  { path: '/compte/mot-de-passe', component: AccountPasswordView },
  { path: '/utilisateurs', component: UsersView },
  { path: '/autres-etablissements', component: TerritoryEstablishmentsView }
];
const guestRoutes: RouteProps[] = [
  { path: '/inscription*', component: AccountCreationView },
  { path: '/connexion', component: LoginView },
  {
    path: '/mot-de-passe/oublie',
    component: ForgottenPasswordView
  },
  {
    path: '/mot-de-passe/nouveau',
    component: ResetPasswordView
  },
  { path: '/admin', component: LoginView },
  { path: '/', component: EstablishmentHomeView }
];

function App() {
  const { pushInstruction } = useMatomo();
  const { isAuthenticated, user } = useUser();
  const { isLoggedOut } = useAppSelector((state) => state.authentication);
  const dispatch = useAppDispatch();
  const isSomeQueryPending = useAppSelector((state) =>
    Object.values(state.api.queries).some(
      (query) => query?.status === 'pending'
    )
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

  const routes = publicRoutes
    .concat(isAuthenticated ? authenticatedRoutes : guestRoutes)
    .map((route) => (
      <Route
        exact
        path={route.path}
        component={route.component}
        key={`route_${route.path}`}
      />
    ));

  const redirection = isAuthenticated
    ? '/parc-de-logements'
    : isLoggedOut
      ? '/connexion'
      : '/';

  return (
    <React.Suspense fallback={<></>}>
      <BrowserRouter>
        {isAuthenticated ? <SmallHeader /> : <Header />}
        <ScrollToTop />

        <Switch>
          <Route path="/stats" component={StatsView} />
          <Route path="/accessibilite" component={AccessibilityView} />
          <Route path="/mentions-legales" component={LegalNoticesView} />,
          {routes}
          <Route path="*">
            <Redirect to={redirection} />
          </Route>
        </Switch>
        <Footer />
      </BrowserRouter>
    </React.Suspense>
  );
}

export default App;
