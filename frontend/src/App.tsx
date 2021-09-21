import React from 'react';
import './App.css';
import { applyMiddleware, createStore } from 'redux';
import AppHeader from './components/AppHeader/AppHeader';
import LoginView from './views/login/LoginView';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import HousingView from './views/housing/HousingView';
import { Provider, useSelector } from 'react-redux';
import thunk from 'redux-thunk';
import applicationReducer, { ApplicationState } from './store/reducers/applicationReducers';


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

    return (
        <>
            <AppHeader />
            <React.Suspense fallback={<></>}>
                <BrowserRouter>
                    <Switch>
                        {user && user.accessToken && <Route exact path="/logements" component={HousingView} />}
                        <Route path="/" component={LoginView} />
                    </Switch>
                </BrowserRouter>
            </React.Suspense>
        </>
    );
}

export default AppWrapper;
