import React from 'react';
import './App.css';
import { applyMiddleware, createStore } from 'redux';
import AppHeader from './components/AppHeader/AppHeader';
import LoginView from './views/login/LoginView';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import HousingView from './views/housing/HousingView';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import applicationReducer from './store/reducers/applicationReducers';

function App() {

    const user = JSON.parse(localStorage.getItem('user') ?? '{}');

    const store = createStore(
        applicationReducer,
        applyMiddleware(thunk)
    );

    return (
        <Provider store={store}>
            <AppHeader />
            <React.Suspense fallback={<></>}>
                <BrowserRouter>
                    <Switch>
                        {user && user.accessToken && <Route exact path="/logements" component={HousingView} />}
                        <Route path="/" component={LoginView} />
                    </Switch>
                </BrowserRouter>
            </React.Suspense>
        </Provider>
    );
}

export default App;
