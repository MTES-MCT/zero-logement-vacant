import React, { ChangeEvent, useState } from 'react';
import {
    Alert,
    Button,
    Col,
    Container,
    Modal,
    ModalContent,
    ModalFooter,
    ModalTitle,
    Row, Text,
    TextInput,
    Title,
} from '@dataesr/react-dsfr';
import { CampaignBundle, CampaignBundleId, campaignFullName } from '../../models/Campaign';
import { TrackEventActions, TrackEventCategories } from '../../models/TrackEvent';
import { deleteCampaignBundle, updateCampaignBundleTitle } from '../../store/actions/campaignAction';
import { useDispatch } from 'react-redux';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import * as yup from 'yup';
import { campaignTitleValidator, useForm } from '../../hooks/useForm';
import ConfirmationModal from '../modals/ConfirmationModal/ConfirmationModal';

interface Props {
    campaignBundle: CampaignBundle
}

const CampaignDeletion = ({ campaignBundle }: Props) => {

    const [deletionModalCampaignBundleId, setDeletionModalCampaignBundleId] = useState<CampaignBundleId | undefined>();

    const onDeleteCampaign = () => {
        if (deletionModalCampaignBundleId?.campaignNumber) {
            trackEvent({
                category: TrackEventCategories.Campaigns,
                action: TrackEventActions.Campaigns.Delete
            })
            dispatch(deleteCampaignBundle(deletionModalCampaignBundleId))
        }
        setDeletionModalCampaignBundleId(undefined);
    }

    return (
        <>
            {campaignIndex === reminderCampaignsOfBundle(campaignBundle).length - 1 && withDeletion &&
                <Button title="Supprimer"
                        tertiary
                        onClick={() => setDeletionModalCampaignBundleId(campaign as CampaignBundleId)}
                        className="fr-btn--tertiary-no-outline"
                        icon="ri-delete-bin-5-fill"
                >
                    Supprimer
                </Button>
            }
            {deletionModalCampaignBundleId && deletionModalCampaignBundleId.campaignNumber &&
                <ConfirmationModal
                    onSubmit={onDeleteCampaign}
                    onClose={() => setDeletionModalCampaignBundleId(undefined)}>
                    <Text size="md">
                        Êtes-vous sûr de vouloir supprimer cette {deletionModalCampaignBundleId.reminderNumber ? 'relance' : 'campagne'} ?
                    </Text>
                    {(!deletionModalCampaignBundleId.reminderNumber && deletionModalCampaignBundleId.campaignNumber < (campaignList ?? []).length) &&
                        <Alert description="Les campagnes suivantes seront renumérotées."
                               type="info"/>
                    }
                    <Alert description='Les statuts des logements "En attente de retour" repasseront en "Jamais contacté". Les autres statuts mis à jour ne seront pas modifiés.'
                           type="info"/>
                </ConfirmationModal>
            }
        </>
    );
};

export default CampaignDeletion;

