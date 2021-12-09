import React from 'react';
import './App.scss';
import { applyMiddleware, createStore } from 'redux';
import AppHeader from './components/AppHeader/AppHeader';
import AppFooter from './components/AppFooter/AppFooter';
import LoginView from './views/Login/LoginView';
import { BrowserRouter, Route, Switch, Redirect } from 'react-router-dom';
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
import { isValidUser } from './models/User';


function AppWrapper () {

    const store = createStore(
        applicationReducer,
        applyMiddleware(thunk)
    );

    return (
        <Provider store={store}>
            <App />
        </Provider>
    );
}

function App() {

    const { authUser } = useSelector((state: ApplicationState) => state.authentication);

    FetchInterceptor();

    return (
        <>
            <React.Suspense fallback={<></>}>
                <BrowserRouter>
                    <AppHeader />
                    {isValidUser(authUser) ?
                        <div className="zlv-container">
                            <ScrollToTop />
                            <Switch>
                                <Route exact path="/accueil" component={DashboardView} />
                                <Route exact path="/logements" component={HousingListView} />
                                <Route exact path="/campagnes" component={CampaignsListView} />
                                <Route exact path="/campagnes/:id" component={CampaignView} />
                                <Route exact path="/logements/proprietaires/:id" component={OwnerView} />
                                <Route exact path="/campagnes/:campagneId/proprietaires/:id" component={OwnerView} />
                                <Route path="/*">
                                    <Redirect to="/accueil" />
                                </Route>
                            </Switch>
                        </div> :
                        <Switch>
                            <Route exact path="/" component={LoginView} />
                            <Route exact path="/admin" component={LoginView} />
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
