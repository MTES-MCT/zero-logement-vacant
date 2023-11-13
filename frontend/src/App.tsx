import React, { useEffect } from 'react';
import { MapProvider } from 'react-map-gl';
import './App.scss';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import LoginView from './views/Login/LoginView';
import { BrowserRouter, Link, Redirect, Route, RouteProps, Switch } from 'react-router-dom';
import HousingListView from './views/HousingList/HousingListView';
import { Provider } from 'react-redux';
import FetchInterceptor from './components/FetchInterceptor/FetchInterceptor';
import OwnerView from './views/Owner/OwnerView';
import CampaignsListView from './views/Campaign/CampainListView';
import CampaignView from './views/Campaign/CampaignView';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';
import { createInstance, MatomoProvider, useMatomo } from '@datapunt/matomo-tracker-react';
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
import OwnerEstablishmentHomeView from './views/Home/OwnerEstablishmentHomeView';
import config from './utils/config';
import { store } from './store/store';
import { useAppSelector } from './hooks/useStore';
import OwnerGenericHomeView from './views/Home/OwnerGenericHomeView';
import InboxView from './views/Inbox/InboxView';
import StatusView from './views/Resources/StatusView';
import LegalNoticesView from './views/LegalNotices/LegalNoticesView';
import AccountView from './views/Account/AccountView';
import GroupView from './views/Group/GroupView';
import { startReactDsfr } from '@codegouvfr/react-dsfr/spa';
import UsersView from './views/Users/UsersView';

declare module "@codegouvfr/react-dsfr/spa" {
  interface RegisterLink {
    Link: typeof Link;
  }
}

function AppWrapper() {

  startReactDsfr({ defaultColorScheme: "light", Link });

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

  FetchInterceptor();

  useEffect(() => {
    pushInstruction('setUserId', user?.id);
  }, [user])

  return (
    <React.Suspense fallback={<></>}>
      <BrowserRouter>
        <Header/>
        <ScrollToTop/>

        <Switch>
          <Route path="/stats" component={StatsView}/>
          <Route path="/accessibilite" component={AccessibilityView}/>
          <Route path="/mentions-legales" component={LegalNoticesView}/>,
          <Route path="/communes/:establishmentRef" component={OwnerEstablishmentHomeView}/>,
          <Route path="/collectivites/:establishmentRef" component={OwnerEstablishmentHomeView}/>,
          <Route path="/collectivites" component={EstablishmentHomeView}/>,
          <Route exact path="/proprietaires" component={OwnerGenericHomeView}/>,
          {isAuthenticated ? [
            ...([
              {path:"/parc-de-logements", component:HousingListView},
              {path:"/groupes/:id",component: GroupView},
              {path:"/campagnes", component:CampaignsListView},
              {path:"/campagnes/:campaignId", component:CampaignView},
              {path:"/proprietaires/:ownerId/logements/:housingId", component:HousingView},
              {path:"/proprietaires/:ownerId", component:OwnerView},
              {path:"/logements/:housingId/proprietaires/:ownerId", component:OwnerView},
              {path:"/logements/:housingId", component:HousingView},
              {path:"/messagerie", component:InboxView},
              {path:"*/informations-publiques", component:EstablishmentView},
              {path:"/ressources/statuts", component:StatusView},
              {path:"/ressources", component:ResourcesView},
              {path:"/compte", component:AccountView},
              {path:"/compte/mot-de-passe", component:AccountPasswordView},
              {path:"/utilisateurs", component:UsersView},
            ].map((route: RouteProps) => <Route path={route.path} exact component={route.component} key={`route_${route.path}`} /> )),
              <Route path="/*" key="route_default">
                <Redirect to="/parc-de-logements"/>
              </Route>
          ] : [
            ...([
              {path:"/inscription*", component:AccountCreationView},
              {path:"/connexion", component:LoginView},
              {path:"/mot-de-passe/oublie", component:ForgottenPasswordView},
              {path:"/mot-de-passe/nouveau", component:ResetPasswordView},
              {path:"/admin", component:LoginView},
              {path:"/", component:EstablishmentHomeView},
            ].map(route => <Route exact path={route.path} component={route.component} key={`route_${route.path}`} /> )),
            <Route path="/*" key="route_default">
              {isLoggedOut ? <Redirect to="/connexion"/> : <Redirect to="/collectivites"/>}
            </Route>
          ]}
        </Switch>
        <Footer/>
      </BrowserRouter>
    </React.Suspense>
  );
}

export default AppWrapper;
