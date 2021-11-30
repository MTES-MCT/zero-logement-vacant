import React from 'react';
import './App.scss';
import { applyMiddleware, createStore } from 'redux';
import AppHeader from './components/AppHeader/AppHeader';
import AppFooter from './components/AppFooter/AppFooter';
import LoginView from './views/Login/LoginView';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import HousingListView from './views/HousingList/HousingListView';
import { Provider, useSelector } from 'react-redux';
import thunk from 'redux-thunk';
import applicationReducer, { ApplicationState } from './store/reducers/applicationReducers';
import FetchInterceptor from './components/FetchInterceptor/FetchInterceptor';
import OwnerView from './views/Owner/OwnerView';
import CampaignsListView from './views/Campaign/CampainListView';
import DashboardView from './views/Dashboard/DashboardView';
import CampaignView from './views/Campaign/CampainView';


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

    const { user } = useSelector((state: ApplicationState) => state.authentication);

    FetchInterceptor();

    return (
        <>
            <React.Suspense fallback={<></>}>
                <BrowserRouter>
                    <AppHeader />
                    <Switch>
                        {user && user.accessToken && <Route exact path="/" component={DashboardView} />}
                        {user && user.accessToken && <Route exact path="/accueil" component={DashboardView} />}
                        {user && user.accessToken && <Route exact path="/logements" component={HousingListView} />}
                        {user && user.accessToken && <Route exact path="/campagnes" component={CampaignsListView} />}
                        {user && user.accessToken && <Route exact path="/campagnes/:id" component={CampaignView} />}
                        {user && user.accessToken && <Route exact path="/logements/proprietaires/:id" component={OwnerView} />}
                        {user && user.accessToken && <Route exact path="/campagnes/:campagneId/proprietaires/:id" component={OwnerView} />}
                        <Route path="/" component={LoginView} />
                    </Switch>
                    <AppFooter />
                </BrowserRouter>
            </React.Suspense>
        </>
    );
}

export default AppWrapper;
