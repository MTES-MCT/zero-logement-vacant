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
import ButtonLink from '../ButtonLink/ButtonLink';

type TitleAs = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface Props {
    campaignBundle: CampaignBundle,
    as?: TitleAs
}

const CampaignBundleTitle = ({ campaignBundle, as }: Props) => {

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
                setIsModalOpen(false)
            }
        })
    }

    return (
        <>
            <Title as={as ?? 'h1'} className="fr-mb-1w ds-fr--inline-block fr-mr-2w">
                {campaignFullName(campaignBundle)}
            </Title>
            <ButtonLink
                display="flex"
                icon="ri-edit-2-fill"
                iconPosition="left"
                iconSize="1x"
                isSimple
                onClick={() => setIsModalOpen(true)}
            >
                Renommer
            </ButtonLink>
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

