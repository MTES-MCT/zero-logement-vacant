import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import { applyMiddleware, createStore } from 'redux';
import applicationReducer from '../../store/reducers/applicationReducers';
import config from '../../utils/config';
import authService from '../../services/auth.service';
import OwnerView from './OwnerView';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { genHousingDetails, genOwner } from '../../../test/fixtures.test';
import { format } from 'date-fns';
import { capitalize } from '../../utils/stringUtils';

describe('housing view', () => {

    let store: any;
    const randomstring = require("randomstring");

    beforeEach(() => {
        fetchMock.resetMocks();
        store = createStore(
            applicationReducer,
            applyMiddleware(thunk)
        );
    });

    test('should display owner infos', async () => {

        const owner = genOwner();
        const housing1 = genHousingDetails();
        const housing2 = genHousingDetails();

        fetchMock.doMockOnceIf(
            `${config.apiEndpoint}/api/owners/${owner.id}`,
            JSON.stringify({ ...owner, birthDate: owner.birthDate ? format(owner.birthDate, 'yyyy-MM-dd') : undefined } ),
            { status: 200 });
        fetchMock.doMockOnceIf(
            `${config.apiEndpoint}/api/housing/owner/${owner.id}`,
            JSON.stringify([housing1, housing2]),
            { status: 200 });

        const history = createMemoryHistory({ initialEntries: [`/proprietaires/${owner.id}`]});

        const { container } = render(
            <Provider store={store}>
                <Router history={history}>
                    <Route exact path="/proprietaires/:id" component={OwnerView} />
                </Router>
            </Provider>
        );

        expect(fetchMock).toHaveBeenCalledWith(
            `${config.apiEndpoint}/api/owners/${owner.id}`, {
                method: 'GET',
                headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
            });

        await waitFor(() => {
            expect(screen.getByTestId('fullName-text').textContent).toBe(capitalize(owner.fullName));
            expect(screen.getByTestId('birthDate-text').textContent).toBe(format(owner.birthDate, 'dd/MM/yyyy'));
            expect(screen.getByTestId('email-text').textContent).toBe(owner.email);
            expect(screen.getByTestId('phone-text').textContent).toBe(owner.phone);

            expect(screen.getAllByText(/Logement [0-9]{1}/i).length).toBe(2);
        });
    });

});
