import React, { ChangeEvent, useState } from 'react';
import {
    Button,
    Col,
    Container,
    Modal,
    ModalContent,
    ModalFooter,
    ModalTitle,
    Row,
    TextInput,
    Title,
} from '@dataesr/react-dsfr';
import { CampaignBundle, CampaignBundleId, campaignFullName } from '../../models/Campaign';
import { TrackEventActions, TrackEventCategories } from '../../models/TrackEvent';
import { updateCampaignBundleTitle } from '../../store/actions/campaignAction';
import { useDispatch } from 'react-redux';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import * as yup from 'yup';
import { campaignTitleValidator, useForm } from '../../hooks/useForm';

interface Props {
    campaignBundle: CampaignBundle
}

const CampaignBundleTitle = ({ campaignBundle }: Props) => {

    const dispatch = useDispatch();
    const { trackEvent } = useMatomo();

    const [campaignTitle, setCampaignTitle] = useState(campaignBundle.title ?? '');
    const schema = yup.object().shape( {
        campaignTitle: campaignTitleValidator
    })
    const { isValid, message, messageType, validate } = useForm(schema, {
        campaignTitle
    })

    const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

    const submitTitle = () => {
        validate().then(() => {
            if (isValid()) {
                trackEvent({
                    category: TrackEventCategories.Campaigns,
                    action: TrackEventActions.Campaigns.Rename
                })
                dispatch(updateCampaignBundleTitle(campaignBundle as CampaignBundleId, campaignTitle))
            }
        })
    }

    return (
        <>
            <Title as="h2" look="h1" className="fr-mb-0">
                {campaignFullName(campaignBundle)}
                <Button title="Renommer"
                        tertiary
                        onClick={() => setIsModalOpen(true)}
                        className="fr-btn--tertiary-no-outline"
                        icon="ri-edit-fill"
                        size="sm"
                >
                    Renommer
                </Button>
            </Title>
            <Modal isOpen={isModalOpen}
                   hide={() => setIsModalOpen(false)}>
                <ModalTitle>
                    <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
                    Titre de la campagne
                </ModalTitle>
                <ModalContent>
                    <Container fluid>
                        <Row gutters>
                            <Col n="10">
                                <TextInput
                                    value={campaignTitle}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setCampaignTitle(e.target.value)}
                                    label="Titre de la campagne"
                                    placeholder="Titre de la campagne"
                                    message={message('campaignTitle')}
                                    messageType={messageType('campaignTitle')}
                                    required
                                />
                            </Col>
                        </Row>
                    </Container>
                </ModalContent>
                <ModalFooter>
                    <Button title="Annuler"
                            secondary
                            className="fr-mr-2w"
                            onClick={() => setIsModalOpen(false)}>
                        Annuler
                    </Button>
                    <Button title="Enregistrer"
                            onClick={() => submitTitle()}>
                        Enregistrer
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    );
};

export default CampaignBundleTitle;

