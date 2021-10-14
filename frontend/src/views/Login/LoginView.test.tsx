import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginView from './LoginView';
import fetchMock from 'jest-fetch-mock';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';


import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import { applyMiddleware, createStore } from 'redux';
import applicationReducer from '../../store/reducers/applicationReducers';

describe('login view', () => {

    let store: any;

    beforeEach(() => {
        fetchMock.resetMocks();
        store = createStore(
            applicationReducer,
            applyMiddleware(thunk)
        );
    });

    test('should render login form', () => {
        render(<Provider store={store}><LoginView/></Provider>);
        const loginInputElement = screen.getByTestId('email-input').querySelector('input');
        const passwordInputElement = screen.getByTestId('password-input').querySelector('input');
        const submitInputElement = screen.getByTestId('login-button');
        expect(loginInputElement).toBeInTheDocument();
        expect(passwordInputElement).toBeInTheDocument();
        expect(submitInputElement).toBeInTheDocument();
    });

    test('should display error message when login failed', async() => {

        fetchMock.mockResponseOnce('[]', { status: 401 });

        render(<Provider store={store}><LoginView/></Provider>);

        const passwordInput = screen.getByTestId('password-input').querySelector('input');
        if (passwordInput) {
            fireEvent.change(passwordInput, { target: { value: 'password' } });
        }
        const emailInput = screen.getByTestId('email-input').querySelector('input');
        if (emailInput) {
            fireEvent.change(emailInput, { target: { value: 'email' } });
        }

        act(() => {
            fireEvent.click(screen.getByTestId('login-button'));
        });

        await waitFor(() => screen.getByTestId('alert-error'))

        expect(fetchMock).toHaveBeenCalled();
        const errorElement = screen.getByTestId('alert-error');
        expect(errorElement).toBeInTheDocument();

    });

    test('should route to housing view when login succeeded', async () => {

        fetchMock.mockResponseOnce(JSON.stringify({ email: 'email', accessToken: 'accessToken' }), { status: 200 });

        const history = createMemoryHistory();
        render(<Provider store={store}><Router history={history}><LoginView/></Router></Provider>);

        const passwordInput = screen.getByTestId('password-input').querySelector('input');
        if (passwordInput) {
            fireEvent.change(passwordInput, { target: { value: 'password' } });
        }
        const emailInput = screen.getByTestId('email-input').querySelector('input');
        if (emailInput) {
            fireEvent.change(emailInput, { target: { value: 'email' } });
        }

        act(() => {
            fireEvent.click(screen.getByTestId('login-button'));
        });

        expect(fetchMock).toHaveBeenCalled();

        await waitFor(() => expect(history.location.pathname).toBe("/logements"));

    });

});
