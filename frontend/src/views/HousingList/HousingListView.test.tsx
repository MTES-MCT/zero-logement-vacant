import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';


import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import { applyMiddleware, createStore } from 'redux';
import applicationReducer from '../../store/reducers/applicationReducers';
import HousingListView from './HousingListView';
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

    test('should display filter menu', () => {
        render(<Provider store={store}><HousingListView/></Provider>);
        const ownersFilterElement = screen.getByTestId('filterMenu');
        expect(ownersFilterElement).toBeInTheDocument();
    });

    test('should filter', async () => {

        fetchMock.mockResponseOnce(JSON.stringify([]), { status: 200 });

        render(<Provider store={store}><HousingListView/></Provider>);

        expect(fetchMock).toHaveBeenCalledWith(
            `${config.apiEndpoint}/api/housing`, {
                method: 'POST',
                headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ filters: {}, search: '' }),
            });

        const filter1Element = screen.getByTestId('filter1');
        const filter2Element = screen.getByTestId('filter2');
        const filter1CheckboxElement = filter1Element.querySelector('input[type="checkbox"]') as HTMLInputElement;
        const filter2CheckboxElement = filter2Element.querySelector('input[type="checkbox"]') as HTMLInputElement;

        act(() => { fireEvent.click(filter1CheckboxElement) });

        expect(fetchMock).toHaveBeenCalledWith(
            `${config.apiEndpoint}/api/housing`, {
            method: 'POST',
            headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ filters: {individualOwner: true}, search: ''}),
        });

        act(() => { fireEvent.click(filter2CheckboxElement) });

        expect(fetchMock).toHaveBeenCalledWith(
            `${config.apiEndpoint}/api/housing`, {
                method: 'POST',
                headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ filters: {individualOwner: true, multiOwner: true}, search: ''}),
            });

        act(() => { fireEvent.click(filter1CheckboxElement) });

        expect(fetchMock).toHaveBeenCalledWith(
            `${config.apiEndpoint}/api/housing`, {
                method: 'POST',
                headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ filters: {individualOwner: false, multiOwner: true}, search: ''}),
            });
    });

    test('should search', async () => {

        fetchMock.mockResponseOnce(JSON.stringify([]), { status: 200 });

        render(<Provider store={store}><HousingListView/></Provider>);

        expect(fetchMock).toHaveBeenCalledWith(
            `${config.apiEndpoint}/api/housing`, {
                method: 'POST',
                headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ filters: {}, search: '' }),
            });

        const searchInputElement = screen.getByTestId('search-input');
        const searchFormElement = screen.getByTestId('search-form');
        fireEvent.change(searchInputElement, {target: {value: 'my search'}});

        act(() => { fireEvent.submit(searchFormElement) });

        expect(fetchMock).toHaveBeenCalledWith(
            `${config.apiEndpoint}/api/housing`, {
            method: 'POST',
            headers: { ...authService.authHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ filters: {}, search: 'my search'}),
        });
    });

});
