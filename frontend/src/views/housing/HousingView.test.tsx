import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';


import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import { applyMiddleware, createStore } from 'redux';
import applicationReducer from '../../store/reducers/applicationReducers';
import HousingView from './HousingView';
import config from '../../utils/config';
import authService from '../../services/auth.service';

describe('housing view', () => {

    let store: any;

    beforeEach(() => {
        fetchMock.resetMocks();
        store = createStore(
            applicationReducer,
            applyMiddleware(thunk)
        );
    });

    test('should display filter types with collapsed options', () => {
        render(<Provider store={store}><HousingView/></Provider>);
        const ownersFilterElement = screen.getByTestId('owners-filter');
        const ownersOptionFilterElement = screen.getByTestId('owners-filter-particulier');
        expect(ownersFilterElement).toBeInTheDocument();
        expect(ownersOptionFilterElement).not.toBeVisible();
    });

    test('should filtering', async () => {

        fetchMock.mockResponseOnce(JSON.stringify([]), { status: 200 });

        render(<Provider store={store}><HousingView/></Provider>);
        const ownersFilterElement = screen.getByTestId('owners-filter');
        const ownersOption1Element = screen.getByTestId('owners-filter1');
        const ownersOption2Element = screen.getByTestId('owners-filter2');

        expect(fetchMock).toHaveBeenCalledWith(
            `${config.apiEndpoint}/api/housing`, {
                method: 'POST',
                headers: { ...authService.authHeader() },
                body: JSON.stringify({}),
            });

        const ownersCheckbox1Element = ownersOption1Element.querySelector('input[type="checkbox"]') as HTMLInputElement;
        const ownersCheckbox2Element = ownersOption2Element.querySelector('input[type="checkbox"]') as HTMLInputElement;

        act(() => { fireEvent.click(ownersCheckbox1Element) });
        act(() => { fireEvent.click(ownersCheckbox2Element) });

        expect(fetchMock).toHaveBeenCalledWith(
            `${config.apiEndpoint}/api/housing`, {
            method: 'POST',
            headers: { ...authService.authHeader() },
            body: JSON.stringify({ ownerKinds: [ownersCheckbox1Element.value, ownersCheckbox2Element.value]}),
        });
    });

});
