import React from 'react';
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
import CampaignView from './views/Campaign/CampainView';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';
import { isValidUser, UserRoles } from './models/User';
import { createInstance, MatomoProvider } from '@datapunt/matomo-tracker-react';
import { campaignBundleIdUrlFragment } from './models/Campaign';
import AccountActivationView from './views/Account/AccountActivationView';
import UserListView from './views/User/UserListView';
import AccountPasswordView from './views/Account/AccountPasswordView';
import HomeView from './views/Home/HomeView';
import StatsView from './views/Stats/StatsView';
import HousingView from './views/Housing/HousingView';
import MonitoringView from './views/Monitoring/MonitoringView';
import AccessibilityView from './views/Accessibility/AccessibilityView';
import MonitoringDetailView from './views/Monitoring/MonitoringDetailView';


function AppWrapper () {

    const instance = createInstance({
        urlBase: 'https://stats.data.gouv.fr/',
        siteId: 212,
        linkTracking: false, // optional, default value: true
    })

    const store = createStore(
        applicationReducer,
        applyMiddleware(thunk)
    );

    return (
        <MatomoProvider value={instance}>
            <Provider store={store}>
                <App />
            </Provider>
        </MatomoProvider>
    );
}

function App() {

    const { authUser, accountActivated } = useSelector((state: ApplicationState) => state.authentication);
    const { campaignBundleFetchingId, campaignCreated } = useSelector((state: ApplicationState) => state.campaign);

    FetchInterceptor();

    return (
        <>
            <React.Suspense fallback={<></>}>
                <BrowserRouter>
                    <AppHeader />
                    {isValidUser(authUser) ?
                        <div className="zlv-container">
                            <ScrollToTop />

                            {campaignCreated && campaignBundleFetchingId &&
                                <Redirect push={true} to={`/campagnes/${campaignBundleIdUrlFragment(campaignBundleFetchingId)}`} />
                            }

                            <Switch>
                                <Route exact path="/" component={DashboardView} />
                                <Route exact path="/stats" component={StatsView} />
                                <Route exact path="/accessibilite" component={AccessibilityView} />
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
                                <Route exact path="/compte/mot-de-passe" component={AccountPasswordView}/>
                                <Route exact path="/compte/activation/:tokenId" component={AccountActivationView}/>
                                <Route exact path="/suivi/etablissement/:establishmentId" component={MonitoringDetailView}/>
                                {authUser.user.role === UserRoles.Admin &&
                                    <Route exact path="/utilisateurs" component={UserListView}/>
                                }
                                {authUser.user.role === UserRoles.Admin &&
                                    <Route exact path="/suivi" component={MonitoringView}/>
                                }
                                <Route path="/*">
                                    <Redirect to="/accueil" />
                                </Route>
                            </Switch>
                        </div> :
                        <Switch>
                            <Route exact path="/" component={HomeView} />
                            <Route exact path="/stats" component={StatsView} />
                            <Route exact path="/accessibilite" component={AccessibilityView} />
                            <Route exact path="/connexion" component={LoginView} />
                            <Route exact path="/admin" component={LoginView} />
                            {!accountActivated &&
                                <Route exact path="/compte/activation/:tokenId" component={AccountActivationView}/>
                            }
                            <Route path="/*">
                                <Redirect to="/" />
                            </Route>
                        </Switch>
                    }
                    <AppFooter />
                </BrowserRouter>
            </React.Suspense>
        </>
    );
}

export default AppWrapper;
