import React, { useEffect } from 'react';
import { MapProvider } from 'react-map-gl';
import './App.scss';
import AppHeader from './components/AppHeader/AppHeader';
import AppFooter from './components/AppFooter/AppFooter';
import LoginView from './views/Login/LoginView';
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';
import HousingListView from './views/HousingList/HousingListView';
import { Provider } from 'react-redux';
import FetchInterceptor from './components/FetchInterceptor/FetchInterceptor';
import OwnerView from './views/Owner/OwnerView';
import CampaignsListView from './views/Campaign/CampainListView';
import CampaignView from './views/Campaign/CampaignView';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';
import {
  createInstance,
  MatomoProvider,
  useMatomo
} from '@datapunt/matomo-tracker-react';
import { campaignBundleIdUrlFragment } from './models/Campaign';
import AccountPasswordView from './views/Account/AccountPasswordView';
import StatsView from './views/Stats/StatsView';
import HousingView from './views/Housing/HousingView';
import AccessibilityView from './views/Accessibility/AccessibilityView';
import ResourcesView from './views/Resources/ResourcesView';
import AccountCreationView from './views/Account/AccountCreationView';
import ForgottenPasswordView from './views/Account/ForgottenPasswordView';
import ResetPasswordView from './views/Account/ResetPasswordView';
import EstablishmentView from './views/Establishment/EstablishmentView';
import { useUser } from './hooks/useUser';
import EstablishmentHomeView from './views/Home/EstablishmentHomeView';
import OwnerEstablishmentHomeView
  from './views/Home/OwnerEstablishmentHomeView';
import config from './utils/config';
import { store } from './store/store';
import { useAppSelector } from './hooks/useStore';
import OwnerGenericHomeView from './views/Home/OwnerGenericHomeView';
import InboxView from './views/Inbox/InboxView';
import StatusView from './views/Resources/StatusView';
import LegalNoticesView from './views/LegalNotices/LegalNoticesView';
import AccountView from './views/Account/AccountView';

function AppWrapper() {

  const AppMapProvider = () =>
    <MapProvider>
      <Provider store={store}>
        <App/>
      </Provider>
    </MapProvider>

  if (config.matomo.urlBase && config.matomo.siteId) {
    return (
      // @ts-ignore
      <MatomoProvider value={createInstance(config.matomo)}>
        <AppMapProvider/>
      </MatomoProvider>
    );
  } else {
    return <AppMapProvider/>;
  }

}

function App() {
  const {pushInstruction} = useMatomo();
  const {isAuthenticated, user} = useUser();
  const {isLoggedOut} = useAppSelector(
    (state) => state.authentication
  );
  const {campaignBundleFetchingId, campaignCreated} = useAppSelector(
    (state) => state.campaign
  );

  FetchInterceptor();

  useEffect(() => {
    pushInstruction('setUserId', user?.id);
  }, [user])

  return (
    <React.Suspense fallback={<></>}>
      <BrowserRouter>
        <AppHeader/>
        <ScrollToTop/>

        {isAuthenticated && campaignCreated && campaignBundleFetchingId &&
            <Redirect push={true}
                      to={`/campagnes/${campaignBundleIdUrlFragment(campaignBundleFetchingId)}`}/>
        }

        <Switch>
          <Route exact path="/stats" component={StatsView}/>
          <Route exact path="/accessibilite" component={AccessibilityView}/>
          <Route path="/mentions-legales" component={LegalNoticesView}/>,
          <Route exact path="/communes/:establishmentRef" component={OwnerEstablishmentHomeView}/>,
          <Route exact path="/collectivites/:establishmentRef" component={OwnerEstablishmentHomeView}/>,
          <Route exact path="/collectivites" component={EstablishmentHomeView}/>,
          <Route exact path="/proprietaires" component={OwnerGenericHomeView}/>,
          {isAuthenticated ? [
            <Route exact path="/parc-de-logements" component={HousingListView} key={Math.random()}/>,
            <Route exact path="/campagnes" component={CampaignsListView} key={Math.random()}/>,
            <Route exact path="/campagnes/C:campaignNumber?" component={CampaignView} key={Math.random()}/>,
            <Route exact path="/campagnes/C:campaignNumber/R:reminderNumber?" component={CampaignView} key={Math.random()}/>,
            <Route exact path="/campagnes/C:campaignNumber/proprietaires/:ownerId" component={OwnerView} key={Math.random()}/>,
            <Route exact path="/campagnes/C:campaignNumber/R:reminderNumber/proprietaires/:ownerId" component={OwnerView} key={Math.random()}/>,
            <Route exact path="/campagnes/C:campaignNumber/logements/:housingId/proprietaires/:ownerId" component={OwnerView} key={Math.random()}/>,
            <Route exact path="/campagnes/C:campaignNumber/R:reminderNumber/logements/:housingId/proprietaires/:ownerId" component={OwnerView} key={Math.random()}/>,
            <Route exact path="/campagnes/C:campaignNumber/logements/:housingId" component={HousingView} key={Math.random()}/>,
            <Route exact path="/campagnes/C:campaignNumber/R:reminderNumber/logements/:housingId" component={HousingView} key={Math.random()}/>,
            <Route exact path="/campagnes/C:campaignNumber/proprietaires/:ownerId/logements/:housingId" component={HousingView} key={Math.random()}/>,
            <Route exact path="/campagnes/C:campaignNumber/R:reminderNumber/proprietaires/:ownerId/logements/:housingId" component={HousingView} key={Math.random()}/>,
            <Route exact path="*/logements/:housingId/proprietaires/:ownerId" component={OwnerView} key={Math.random()}/>,
            <Route exact path="*/proprietaires/:ownerId" component={OwnerView} key={Math.random()}/>,
            <Route exact path="*/proprietaires/:ownerId/logements/:housingId" component={HousingView} key={Math.random()}/>,
            <Route exact path="*/logements/:housingId" component={HousingView} key={Math.random()}/>,
            <Route exact path="/messagerie" component={InboxView} key={Math.random()}/>,
            <Route exact path="*/informations-publiques" component={EstablishmentView} key={Math.random()}/>,
            <Route exact path="/ressources" component={ResourcesView} key={Math.random()}/>,
            <Route exact path="/ressources/statuts" component={StatusView} key={Math.random()}/>,
            <Route exact path="/compte" component={AccountView} key={Math.random()}/>,
            <Route exact path="/compte/mot-de-passe" component={AccountPasswordView} key={Math.random()}/>,
            <Route path="/*" key={Math.random()}>
              <Redirect to="/parc-de-logements"/>
            </Route>
          ] : [
            <Route path="/inscription" component={AccountCreationView} key={Math.random()}/>,
            <Route exact path="/connexion" component={LoginView} key={Math.random()}/>,
            <Route exact path="/mot-de-passe/oublie" component={ForgottenPasswordView} key={Math.random()}/>,
            <Route exact path="/mot-de-passe/nouveau" component={ResetPasswordView} key={Math.random()}/>,
            <Route exact path="/admin" component={LoginView} key={Math.random()}/>,
            <Route exact path="/" component={EstablishmentHomeView} key={Math.random()}/>,
            <Route path="/*" key={Math.random()}>
              {isLoggedOut ? <Redirect to="/connexion"/> : <Redirect to="/collectivites"/>}
            </Route>
          ]}
        </Switch>
        <AppFooter/>
      </BrowserRouter>
    </React.Suspense>
  );
}

export default AppWrapper;
