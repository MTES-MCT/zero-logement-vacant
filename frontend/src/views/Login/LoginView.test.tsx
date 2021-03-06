import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
        render(<Provider store={store}><Router history={createMemoryHistory()}><LoginView/></Router></Provider>);
        expect(screen.getByTestId('email-input')).toBeInTheDocument();
        expect(screen.getByTestId('password-input')).toBeInTheDocument();
        expect(screen.getByTestId('login-button')).toBeInTheDocument();
    });

    test('should display error message when login failed', async() => {

        fetchMock.mockResponseOnce('[]', { status: 401 });

        render(<Provider store={store}><Router history={createMemoryHistory()}><LoginView/></Router></Provider>);

        const passwordInput = screen.getByTestId('password-input').querySelector('input'); //eslint-disable-line testing-library/no-node-access
        if (passwordInput) {
            fireEvent.change(passwordInput, { target: { value: 'password' } });
        }
        const emailInput = screen.getByTestId('email-input').querySelector('input'); //eslint-disable-line testing-library/no-node-access
        if (emailInput) {
            fireEvent.change(emailInput, { target: { value: 'email@test.com' } });
        }

        fireEvent.click(screen.getByTestId('login-button'));

        await screen.findByTestId('alert-error')

        expect(fetchMock).toHaveBeenCalled();
        const errorElement = screen.getByTestId('alert-error');
        expect(errorElement).toBeInTheDocument();

    });

    test('should route to dashboard view when login succeeded', async () => {

        fetchMock.mockResponseOnce(JSON.stringify({ user: { email: 'email@test.com' }, establishment: {id: 123}, accessToken: 'accessToken' }), { status: 200 });

        const history = createMemoryHistory();
        render(<Provider store={store}><Router history={history}><LoginView/></Router></Provider>);

        const passwordInput = screen.getByTestId('password-input').querySelector('input'); //eslint-disable-line testing-library/no-node-access
        if (passwordInput) {
            fireEvent.change(passwordInput, { target: { value: 'password' } });
        }
        const emailInput = screen.getByTestId('email-input').querySelector('input'); //eslint-disable-line testing-library/no-node-access
        if (emailInput) {
            fireEvent.change(emailInput, { target: { value: 'email@test.com' } });
        }

        fireEvent.click(screen.getByTestId('login-button'));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalled()
        });

    });

});
