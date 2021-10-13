import React from 'react';
import { render, screen } from '@testing-library/react';
import AppHeader from './AppHeader';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore } from 'redux';
import applicationReducer from '../../store/reducers/applicationReducers';
import thunk from 'redux-thunk';
import { genUser } from '../../../test/fixtures.test';

describe('AppHeader', () => {

    test('should not display navbar when user no user is logged', () => {
        const store = createStore(applicationReducer, applyMiddleware(thunk));

        render(<Provider store={store}><Router history={createMemoryHistory()}><AppHeader/></Router></Provider>);

        const loginInputElement = screen.queryByTestId('header-nav');
        expect(loginInputElement).not.toBeInTheDocument();
    });

    test('should display navbar when a user is logged', () => {
        const store = createStore(
            applicationReducer,
            {authentication: {isLoggedIn: true, user: genUser()}},
            applyMiddleware(thunk)
        );

        render(<Provider store={store}><Router history={createMemoryHistory()}><AppHeader/></Router></Provider>);

        const loginInputElement = screen.queryByTestId('header-nav');
        expect(loginInputElement).toBeInTheDocument();
    });

});
