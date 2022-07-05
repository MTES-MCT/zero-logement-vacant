import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CampaignCreationModal from './CampaignCreationModal';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore } from 'redux';
import applicationReducer from '../../../store/reducers/applicationReducers';
import thunk from 'redux-thunk';
import { genAuthUser } from '../../../../test/fixtures.test';
import config from '../../../utils/config';
import fetchMock from 'jest-fetch-mock';

describe('Campagne creation modal', () => {

    let store: any;

    const defaultFetchMock = (request: Request) => {
        return Promise.resolve(
            (request.url === `${config.apiEndpoint}/api/campaigns`) ? {body: JSON.stringify([]), init: { status: 200 }} :
                    {body: '', init: {status: 404 } }
        )
    }

    beforeEach(() => {
        fetchMock.resetMocks();
        store = createStore(
            applicationReducer,
            {authentication: {isLoggedIn: true, authUser: genAuthUser(), accountActivated: true}},
            applyMiddleware(thunk)
        );
    });

    test('should display housing count, select with next 6 months input and submit button', () => {

        fetchMock.mockResponse(defaultFetchMock);

        render(
            <Provider store={store}>
                <CampaignCreationModal housingCount={2}
                                       onSubmit={() => {}}
                                       onClose={() => {}} />
            </Provider>
        );

        const housingInfosTextElement = screen.getByTestId('housing-infos');
        const startMonthSelectElement = screen.getByTestId('start-month-select');
        const createButton = screen.getByTestId('create-button');
        expect(housingInfosTextElement).toBeInTheDocument();
        expect(housingInfosTextElement).toContainHTML('<b>2 logements</b>');
        expect(startMonthSelectElement).toBeInTheDocument();
        expect(startMonthSelectElement.querySelectorAll('option').length).toBe(7);  //eslint-disable-line testing-library/no-node-access
        expect(createButton).toBeInTheDocument();
    });

    test('should require campaign start month', async() => {

        fetchMock.mockResponse(defaultFetchMock);

        render(
            <Provider store={store}>
                <CampaignCreationModal housingCount={2}
                                       onSubmit={() => {
                                       }}
                                       onClose={() => {
                                       }}/>
            </Provider>
        );

        fireEvent.click(screen.getByTestId('create-button'));

        const startMonthSelectElement = await screen.findByTestId('start-month-select');
        expect(startMonthSelectElement.querySelector('.fr-error-text')).toBeInTheDocument(); //eslint-disable-line testing-library/no-node-access
    });

});
