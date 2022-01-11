import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Button,
    Container,
    Modal,
    ModalClose,
    ModalContent,
    ModalFooter,
    ModalTitle,
    Select,
} from '@dataesr/react-dsfr';
import { CampaignHousing, CampaignHousingUpdate, Housing } from '../../../models/Housing';
import { DefaultOption, SelectOption } from '../../../models/SelectOption';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../../store/reducers/applicationReducers';
import { listCampaigns } from '../../../store/actions/campaignAction';
import CampaignHousingStatusForm from './CampaignHousingStatusForm';

const CampaignHousingStatusModal = (
    {
        housingList,
        campaignHousingList,
        onSubmit,
        onClose
    }: {
        housingList: Housing[],
        campaignHousingList: CampaignHousing[],
        onSubmit: (campaignHousing: CampaignHousing, campaignHousingUpdate: CampaignHousingUpdate) => void,
        onClose: () => void
    }) => {

    const dispatch = useDispatch();
    const statusFormRef = useRef<{validate: () => void}>();

    const [housingId, setHousingId] = useState<string>();
    const [campaignHousingOptions, setCampaignHousingOptions] = useState<SelectOption[]>();
    const [campaignHousing, setCampaignHousing] = useState<CampaignHousing>();

    const { campaignList } = useSelector((state: ApplicationState) => state.campaign);

    useEffect(() => {
        if (!campaignList) {
            dispatch(listCampaigns())
        }
        if (housingList?.length === 1) {
            selectHousing(housingList[0].id)
        }
    },[dispatch])


    const housingOptions = housingList ? [
        DefaultOption,
        ...housingList.map(housing => (
            {value: housing.id, label: [`Logement ${housingList.findIndex(h => h.id === housing.id) + 1}`, ...housing.rawAddress].join(' - ')}
        ))
    ]: undefined

    const selectHousing = (housingId: string) => {
        setHousingId(housingId);
        const list = campaignHousingList?.filter(_ => _.id === housingId)
        if (list.length === 1) {
            setCampaignHousingOptions(undefined)
            selectCampaign(housingId, list[0].campaignId)
        } else {
            setCampaignHousing(undefined)
            setCampaignHousingOptions([
                DefaultOption,
                ...list.map(campaignHousing => ({
                    value: campaignHousing.campaignId,
                    label: campaignList?.find(campaign => campaign.id === campaignHousing.campaignId)?.name ?? ''
                }))
            ])
        }
    }

    const selectCampaign = (housingId: string, campaignId: string) => {
        setCampaignHousing(campaignHousingList.find(campaignHousing => campaignHousing.campaignId === campaignId && campaignHousing.id === housingId));
    }

    const submit = (campaignHousingUpdate: CampaignHousingUpdate) => {
        if (campaignHousing) {
            onSubmit(campaignHousing, campaignHousingUpdate)
        }
    }

    return (
        <Modal isOpen={true}
               hide={() => onClose()}
               data-testid="campaign-creation-modal"
               size="lg">
            <ModalClose hide={() => onClose()} title="Fermer la fenêtre">Fermer</ModalClose>
            <ModalTitle>
                <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
                Mettre à jour le dossier
            </ModalTitle>
            <ModalContent>
                <Container fluid>
                    {housingOptions &&
                        <Select
                            label="Logement concerné"
                            options={housingOptions}
                            selected={housingId}
                            onChange={(e: any) => selectHousing(e.target.value)}/>
                    }
                    {campaignHousingOptions && campaignHousingOptions.length === 1 ?
                        <Alert title=""
                               description="Ce logement n'est pas dans une campagne, vous ne pouvez pas mettre à jour son statut."
                               className="fr-mb-3w"
                               type="error"/> : <>
                        {campaignHousingOptions && campaignHousingOptions.length > 1 && housingId &&
                            <Select
                                label="Campagne"
                                options={campaignHousingOptions}
                                selected={campaignHousing?.campaignId}
                                onChange={(e: any) => selectCampaign(housingId, e.target.value)}/>
                        }
                        {campaignHousing &&
                            <CampaignHousingStatusForm previousStatus={campaignHousing.status}
                                                       previousStep={campaignHousing.step}
                                                       previousPrecision={campaignHousing.precision}
                                                       onValidate={submit}
                                                       ref={statusFormRef}/>
                        }

                        </>}
                </Container>
            </ModalContent>
            <ModalFooter>
                <Button title="Annuler"
                        secondary
                        className="fr-mr-2w"
                        onClick={() => onClose()}>
                    Annuler
                </Button>
                {campaignHousingOptions?.length !== 1 &&
                    <Button title="Enregistrer"
                            onClick={() => statusFormRef.current?.validate()}>
                        Enregistrer
                    </Button>
                }
            </ModalFooter>
        </Modal>
    );
};

export default CampaignHousingStatusModal;

