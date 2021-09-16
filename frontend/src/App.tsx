import React from 'react';
import './App.css';
import AppHeader from './components/AppHeader/AppHeader';
import LoginView from './views/login/LoginView';
import { Switch, BrowserRouter, Route } from 'react-router-dom';
import HousingView from './views/housing/HousingView';

function App() {

    const user = JSON.parse(localStorage.getItem('user') ?? '{}');

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

export default App;
