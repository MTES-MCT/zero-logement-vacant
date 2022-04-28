import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';


import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import { applyMiddleware, createStore } from 'redux';
import applicationReducer from '../../store/reducers/applicationReducers';
import HousingListView from './HousingListView';
import config from '../../utils/config';
import authService from '../../services/auth.service';
import { initialHousingFilters } from '../../store/reducers/housingReducer';
import { genAuthUser, genCampaign, genHousing, genPaginatedResult } from '../../../test/fixtures.test';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { ownerKindOptions } from '../../models/HousingFilters';

describe('housing view', () => {

    let store: any;

    const defaultFetchMock = (request: Request) => {
        return Promise.resolve(
            (request.url === `${config.apiEndpoint}/api/housing`) ? {body: JSON.stringify(genPaginatedResult([])), init: { status: 200 }} :
                (request.url === `${config.apiEndpoint}/api/campaigns`) ? {body: JSON.stringify([]), init: { status: 200 }} :
                    {body: '', init: {status: 404 } }
        )
    }

    beforeEach(() => {
        fetchMock.resetMocks();
        store = createStore(
            applicationReducer,
            {authentication: {isLoggedIn: true, authUser: genAuthUser(), accountActivated: false}},
            applyMiddleware(thunk)
        );
    });

    test('should only show owner filters initially', () => {

        fetchMock.mockResponse(defaultFetchMock);

        render(
            <Provider store={store}>
                <Router history={createMemoryHistory()}>
                    <HousingListView/>
                </Router>
            </Provider>
        );
        const ownerFiltersElement = screen.getByTestId('owner-filters');
        const additionalFiltersElement = screen.getByTestId('additional-filters');
        expect(ownerFiltersElement).toBeInTheDocument();
        expect(additionalFiltersElement).not.toBeVisible();
    });

    test('should enable to show and hide additional filters ', () => {

        fetchMock.mockResponse(defaultFetchMock);

        render(
            <Provider store={store}>
                <Router history={createMemoryHistory()}>
                    <HousingListView/>
                </Router>
            </Provider>
        );
        const additionalFiltersElement = screen.getByTestId('additional-filters');
        const additionalFiltersButton = screen.getByTestId('additional-filters-button');

        fireEvent.click(additionalFiltersButton)
        expect(additionalFiltersElement).toBeVisible();

        fireEvent.click(additionalFiltersButton)
        expect(additionalFiltersElement).not.toBeVisible();
    });

    test('should filter', async () => {

        fetchMock.mockResponse(defaultFetchMock);

        render(
            <Provider store={store}>
                <Router history={createMemoryHistory()}>
                    <HousingListView/>
                </Router>
            </Provider>
        );

        const ownerKindCheckboxes = screen.queryAllByTestId('type-checkbox-group')[0].querySelectorAll('input');

        act(() => { fireEvent.click(ownerKindCheckboxes[0]) } )

        expect(fetchMock).toHaveBeenCalledWith(
            `${config.apiEndpoint}/api/housing`, {
                method: 'POST',
                headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ filters: { ...initialHousingFilters, ownerKinds: [ownerKindOptions[0].value]}, page: 1, perPage: config.perPageDefault}),
            });
    });

    test('should search', async () => {

        fetchMock.mockResponse(defaultFetchMock);

        render(
            <Provider store={store}>
                <Router history={createMemoryHistory()}>
                    <HousingListView/>
                </Router>
            </Provider>
        );

        const searchInputElement = screen.getByTestId('search-input');
        const searchFormElement = screen.getByTestId('search-form');
        fireEvent.change(searchInputElement, {target: {value: 'my search'}});

        act(() => { fireEvent.submit(searchFormElement) });

        expect(fetchMock).toHaveBeenCalledWith(
            `${config.apiEndpoint}/api/housing`, {
            method: 'POST',
            headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ filters: {...initialHousingFilters, query: 'my search'}, page: 1, perPage: config.perPageDefault}),
        });
    });

    test('should display an alert message on creating campaign if no housing are selected', async () => {

        const housing = genHousing();
        const campaign = genCampaign();
        const paginated = genPaginatedResult([housing]);

        fetchMock.mockResponse((request: Request) => {
            return Promise.resolve(
                (request.url === `${config.apiEndpoint}/api/housing`) ? {body: JSON.stringify(paginated), init: { status: 200 }} :
                    (request.url === `${config.apiEndpoint}/api/campaigns`) ? {body: JSON.stringify([campaign]), init: { status: 200 }} :
                        {body: '', init: {status: 404 } }
            )
        });

        render(
            <Provider store={store}>
                <Router history={createMemoryHistory()}>
                    <HousingListView/>
                </Router>
            </Provider>
        );

        const createCampaignButton = await screen.findByTestId('create-campaign-button');

        fireEvent.click(createCampaignButton);

        const noHousingAlert = screen.getByTestId('no-housing-alert');
        expect(noHousingAlert).toBeInTheDocument();
    });

    test('should enable the creation of the campaign when at least a housing is selected', async () => {

        const housing = genHousing();
        const campaign = genCampaign();
        const paginated = genPaginatedResult([housing]);

        fetchMock.mockResponse((request: Request) => {
            return Promise.resolve(
                (request.url === `${config.apiEndpoint}/api/housing`) ? {body: JSON.stringify(paginated), init: { status: 200 }} :
                    (request.url === `${config.apiEndpoint}/api/campaigns`) ? {body: JSON.stringify([campaign]), init: { status: 200 }} :
                        {body: '', init: {status: 404 } }
            )
        });

        render(
            <Provider store={store}>
                <Router history={createMemoryHistory()}>
                    <HousingListView/>
                </Router>
            </Provider>
        );

        const createCampaignButton = await screen.findByTestId('create-campaign-button');
        const housing1Element = await screen.findByTestId('housing-check-' + housing.id);
        const housing1CheckboxElement = housing1Element.querySelector('input[type="checkbox"]') as HTMLInputElement;

        fireEvent.click(housing1CheckboxElement);
        fireEvent.click(createCampaignButton);

        const campaignCreationModal = screen.getByTestId('campaign-creation-modal');

        expect(campaignCreationModal).toBeInTheDocument();

    });

});
