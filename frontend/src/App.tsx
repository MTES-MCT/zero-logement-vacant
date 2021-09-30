import React from 'react';
import './App.scss';
import { applyMiddleware, createStore } from 'redux';
import AppHeader from './components/AppHeader/AppHeader';
import LoginView from './views/Login/LoginView';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import HousingListView from './views/HousingList/HousingListView';
import { Provider, useSelector } from 'react-redux';
import thunk from 'redux-thunk';
import applicationReducer, { ApplicationState } from './store/reducers/applicationReducers';
import FetchInterceptor from './components/FetchInterceptor/FetchInterceptor';
import HousingDetailView from './views/HousingDetail/HousingDetailView';


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
            <AppHeader />
            <React.Suspense fallback={<></>}>
                <BrowserRouter>
                    <Switch>
                        {user && user.accessToken && <Route exact path="/logements" component={HousingListView} />}
                        {user && user.accessToken && <Route exact path="/logements/:id" component={HousingDetailView} />}
                        <Route path="/" component={LoginView} />
                    </Switch>
                </BrowserRouter>
            </React.Suspense>
        </>
    );
}

export default AppWrapper;
