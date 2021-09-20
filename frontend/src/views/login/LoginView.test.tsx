import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginView from './LoginView';
import fetchMock from 'jest-fetch-mock';
import { BrowserRouter } from 'react-router-dom';

describe('login view', () => {
    beforeEach(() => {
        fetchMock.resetMocks();
    });

    test('should render login form', () => {
        render(<LoginView/>);
        const loginInputElement = screen.getByTestId('email-input').querySelector('input');
        const passwordInputElement = screen.getByTestId('password-input').querySelector('input');
        const submitInputElement = screen.getByTestId('login-button');
        expect(loginInputElement).toBeInTheDocument();
        expect(passwordInputElement).toBeInTheDocument();
        expect(submitInputElement).toBeInTheDocument();
    });

    test('should display error message when login failed', async() => {

        fetchMock.mockResponseOnce('[]', { status: 401 });

        render(<LoginView/>);
        // @ts-ignore
        fireEvent.change(screen.getByTestId('password-input').querySelector('input'), {target: {value: 'password'}});
        // @ts-ignore
        fireEvent.change(screen.getByTestId('email-input').querySelector('input'), {target: {value: 'email'}});

        fireEvent.click(screen.getByTestId('login-button'));

        await waitFor(() => screen.getByTestId('alert-error'))

        expect(fetchMock).toHaveBeenCalled();
        const errorElement = screen.getByTestId('alert-errora');
        expect(errorElement).toBeInTheDocument();

    });

    test('should route to housing view when login succeeded', async () => {

        fetchMock.mockResponseOnce(JSON.stringify([{ email: 'email', accessToken: 'accessToken' }]), { status: 200 });

        const { container } = render(<BrowserRouter><LoginView/></BrowserRouter>);

        // @ts-ignore
        fireEvent.change(screen.getByTestId('password-input').querySelector('input'), { target: { value: 'password' } });
        // @ts-ignore
        fireEvent.change(screen.getByTestId('email-input').querySelector('input'), { target: { value: 'email' } });

        act(() => {
            fireEvent.click(screen.getByTestId('login-button'));
        });

        expect(fetchMock).toHaveBeenCalled();

        // TODO
        // await waitFor(() => expect(container).toHaveTextContent(/filtres/));

    });

});
