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
                                <Route exact path="/accueil" component={DashboardView} />
                                <Route exact path="/logements" component={HousingListView} />
                                <Route exact path="/campagnes" component={CampaignsListView} />
                                <Route exact path="/campagnes/C:campaignNumber?" component={CampaignView} />
                                <Route exact path="/campagnes/C:campaignNumber/R:reminderNumber?" component={CampaignView} />
                                <Route exact path="/campagnes/C:campaignNumber/proprietaires/:id" component={OwnerView} />
                                <Route exact path="/campagnes/C:campaignNumber/R:reminderNumber/proprietaires/:id" component={OwnerView} />
                                <Route exact path="*/proprietaires/:id" component={OwnerView} />
                                <Route exact path="/compte/activation/:tokenId" component={AccountActivationView}/>
                                {authUser.user.role === UserRoles.Admin &&
                                    <Route exact path="/utilisateurs" component={UserListView}/>
                                }
                                <Route path="/*">
                                    <Redirect to="/accueil" />
                                </Route>
                            </Switch>
                        </div> :
                        <Switch>
                            <Route exact path="/" component={LoginView} />
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
