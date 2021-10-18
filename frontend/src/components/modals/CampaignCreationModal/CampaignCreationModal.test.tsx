import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CampaignCreationModal from './CampaignCreationModal';

describe('Campagne creation modal', () => {

    test('should display housing count, name input and submit button', () => {

        render(
            <CampaignCreationModal housingCount={2}
                                   ownerCount={1}
                                   onSubmit={() => {}}
                                   onClose={() => {}} />
        );

        const housingCountTextElement = screen.getByText('2 logements');
        const ownerCountTextElement = screen.getByText('1 propriétaires');
        const campaignNameInputElement = screen.getByTestId('campaign-name-input');
        const createButton = screen.getByTestId('create-button');
        expect(housingCountTextElement).toBeInTheDocument();
        expect(ownerCountTextElement).toBeInTheDocument();
        expect(campaignNameInputElement).toBeInTheDocument();
        expect(createButton).toBeInTheDocument();
    });

    test('should require campaign name', () => {

        render(
            <CampaignCreationModal housingCount={2}
                                   ownerCount={1}
                                   onSubmit={() => {}}
                                   onClose={() => {}} />
        );

        fireEvent.click(screen.getByTestId('create-button'));

        const campaignNameInputElement = screen.getByTestId('campaign-name-input');
        expect(campaignNameInputElement.querySelector('.fr-error-text')).toBeInTheDocument();
    });

});
