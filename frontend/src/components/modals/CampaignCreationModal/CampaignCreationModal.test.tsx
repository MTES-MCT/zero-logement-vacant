import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import CampaignCreationModal from './CampaignCreationModal';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore } from 'redux';
import applicationReducer from '../../../store/reducers/applicationReducers';
import thunk from 'redux-thunk';

describe('Campagne creation modal', () => {

    let store: any;

    beforeEach(() => {
        store = createStore(
            applicationReducer,
            applyMiddleware(thunk)
        );
    });

    test('should display housing count, select with next 6 months input and submit button', () => {

        render(
            <Provider store={store}>
                <CampaignCreationModal housingCount={2}
                                       ownerCount={1}
                                       onSubmit={() => {}}
                                       onClose={() => {}} />
            </Provider>
        );

        const housingInfosTextElement = screen.getByTestId('housing-infos');
        const startMonthSelectElement = screen.getByTestId('start-month-select');
        const createButton = screen.getByTestId('create-button');
        expect(housingInfosTextElement).toBeInTheDocument();
        expect(housingInfosTextElement).toContainHTML('<b>2</b> logements / <b>1</b> propriétaires');
        expect(startMonthSelectElement).toBeInTheDocument();
        expect(startMonthSelectElement.querySelectorAll('option').length).toBe(7)
        expect(createButton).toBeInTheDocument();
    });

    test('should require campaign start month', async() => {

        render(
            <Provider store={store}>
                <CampaignCreationModal housingCount={2}
                                       ownerCount={1}
                                       onSubmit={() => {
                                       }}
                                       onClose={() => {
                                       }}/>
            </Provider>
        );

        act(() => {
            fireEvent.click(screen.getByTestId('create-button'));
        })

        const startMonthSelectElement = await screen.findByTestId('start-month-select');
        expect(startMonthSelectElement.querySelector('.fr-error-text')).toBeInTheDocument();
    });

});
