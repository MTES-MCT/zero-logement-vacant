import React from 'react';
import { MapProvider } from 'react-map-gl';
import './App.scss';
import { applyMiddleware, createStore } from 'redux';
import AppHeader from './components/AppHeader/AppHeader';
import AppFooter from './components/AppFooter/AppFooter';
import LoginView from './views/Login/LoginView';
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';
import HousingListView from './views/HousingList/HousingListView';
import { Provider, useSelector } from 'react-redux';
import thunk from 'redux-thunk';
import applicationReducer, { ApplicationState } from './store/reducers/applicationReducers';
import FetchInterceptor from './components/FetchInterceptor/FetchInterceptor';
import OwnerView from './views/Owner/OwnerView';
import CampaignsListView from './views/Campaign/CampainListView';
import DashboardView from './views/Dashboard/DashboardView';
import CampaignView from './views/Campaign/CampaignView';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';
import { createInstance, MatomoProvider } from '@datapunt/matomo-tracker-react';
import { campaignBundleIdUrlFragment } from './models/Campaign';
import UserListView from './views/User/UserListView';
import AccountPasswordView from './views/Account/AccountPasswordView';
import StatsView from './views/Stats/StatsView';
import HousingView from './views/Housing/HousingView';
import MonitoringView from './views/Monitoring/MonitoringView';
import AccessibilityView from './views/Accessibility/AccessibilityView';
import ProprietaireView from './views/Proprietaire/ProprietaireView';
import MonitoringDetailView from './views/Monitoring/MonitoringDetailView';
import ResourcesView from './views/Resources/ResourcesView';
import AccountCreationView from './views/Account/AccountCreationView';
import ForgottenPasswordView from './views/Account/ForgottenPasswordView';
import ResetPasswordView from './views/Account/ResetPasswordView';
import EstablismentView from './views/Establishment/EstablismentView';
import { useUser } from './hooks/useUser';
import EstablishmentHomeView from './views/Home/EstablishmentHomeView';
import OwnerHomeView from './views/Home/OwnerHomeView';

function AppWrapper() {
  const instance = createInstance({
    urlBase: 'https://stats.data.gouv.fr/',
    siteId: 212,
    srcUrl: 'https://stats.data.gouv.fr/js/container_1DHkPTZd.js',
    linkTracking: true,
  });

  const store = createStore(applicationReducer, applyMiddleware(thunk));

  return (
    // @ts-ignore
    <MatomoProvider value={instance}>
      <MapProvider>
        <Provider store={store}>
          <App />
        </Provider>
      </MapProvider>
    </MatomoProvider>
  );
}

function App() {
  const { isAdmin, isAuthenticated } = useUser();
  const { isLoggedOut } = useSelector(
    (state: ApplicationState) => state.authentication
  );
  const { campaignBundleFetchingId, campaignCreated } = useSelector(
    (state: ApplicationState) => state.campaign
  );

  FetchInterceptor();

  return (
    <React.Suspense fallback={<></>}>
      <BrowserRouter>
        <AppHeader />
        {isAuthenticated ?
          <>
            <ScrollToTop />

            {campaignCreated && campaignBundleFetchingId &&
              <Redirect push={true} to={`/campagnes/${campaignBundleIdUrlFragment(campaignBundleFetchingId)}`} />
            }

            <Switch>
              <Route exact path="/" component={DashboardView} />
              <Route exact path="/stats" component={StatsView} />
              <Route exact path="/accessibilite" component={AccessibilityView} />
              <Route exact path="/proprietaire" component={ProprietaireView} />
              <Route exact path="/accueil" component={DashboardView} />
              <Route exact path="/base-de-donnees" component={HousingListView} />
              <Route exact path="/campagnes" component={CampaignsListView} />
              <Route exact path="/campagnes/C:campaignNumber?" component={CampaignView} />
              <Route exact path="/campagnes/C:campaignNumber/R:reminderNumber?" component={CampaignView} />
              <Route exact path="/campagnes/C:campaignNumber/proprietaires/:ownerId" component={OwnerView} />
              <Route exact path="/campagnes/C:campaignNumber/R:reminderNumber/proprietaires/:ownerId" component={OwnerView} />
              <Route exact path="/campagnes/C:campaignNumber/logements/:housingId/proprietaires/:ownerId" component={OwnerView} />
              <Route exact path="/campagnes/C:campaignNumber/R:reminderNumber/logements/:housingId/proprietaires/:ownerId" component={OwnerView} />
              <Route exact path="/campagnes/C:campaignNumber/logements/:housingId" component={HousingView} />
              <Route exact path="/campagnes/C:campaignNumber/R:reminderNumber/logements/:housingId" component={HousingView} />
              <Route exact path="/campagnes/C:campaignNumber/proprietaires/:ownerId/logements/:housingId" component={HousingView} />
              <Route exact path="/campagnes/C:campaignNumber/R:reminderNumber/proprietaires/:ownerId/logements/:housingId" component={HousingView} />
              <Route exact path="*/logements/:housingId/proprietaires/:ownerId" component={OwnerView} />
              <Route exact path="*/proprietaires/:ownerId" component={OwnerView} />
              <Route exact path="*/proprietaires/:ownerId/logements/:housingId" component={HousingView} />
              <Route exact path="*/logements/:housingId" component={HousingView} />
              <Route exact path="*/territoire" component={EstablismentView} />
              <Route exact path="/ressources" component={ResourcesView} />
              <Route exact path="/compte/mot-de-passe" component={AccountPasswordView}/>
              <Route exact path="/suivi/etablissement/:establishmentId" component={MonitoringDetailView}/>
              <Route exact path="/utilisateurs" component={UserListView}/>
              {isAdmin &&
                <Route exact path="/suivi" component={MonitoringView}/>
              }
              <Route path="/*">
                <Redirect to="/accueil" />
              </Route>
            </Switch>
          </> :
          <Switch>
            <Route path="/inscription" component={AccountCreationView} />
            <Route exact path="/collectivites/connexion" component={LoginView} />
            <Route exact path="/collectivites" component={EstablishmentHomeView} />
            <Route exact path="/proprietaires" component={OwnerHomeView} />
            <Route exact path="/stats" component={StatsView} />
            <Route exact path="/accessibilite" component={AccessibilityView} />
            <Route exact path="/proprietaire" component={ProprietaireView} />
            <Route exact path="/mot-de-passe/oublie" component={ForgottenPasswordView} />
            <Route exact path="/mot-de-passe/nouveau" component={ResetPasswordView} />
            <Route exact path="/admin" component={LoginView} />
            <Route exact path="/" component={EstablishmentHomeView} />
            <Route path="/*">
              { isLoggedOut ? <Redirect to="/collectivites/connexion" /> : <Redirect to="/collectivites" /> }
            </Route>
          </Switch>
        }
        <AppFooter />
      </BrowserRouter>
    </React.Suspense>
  );
}

export default AppWrapper;
