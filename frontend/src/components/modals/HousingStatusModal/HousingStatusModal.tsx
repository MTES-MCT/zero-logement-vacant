import React, { useEffect, useRef, useState } from 'react';
import {
    Button,
    Container,
    Modal,
    ModalClose,
    ModalContent,
    ModalFooter,
    ModalTitle,
    Select,
} from '@dataesr/react-dsfr';
import { Housing, HousingUpdate } from '../../../models/Housing';
import { DefaultOption, SelectOption } from '../../../models/SelectOption';
import { useDispatch } from 'react-redux';
import { useCampaignList } from '../../../hooks/useCampaignList';
import HousingStatusForm from './HousingStatusForm';

const HousingStatusModal = (
    {
        housingList,
        onSubmit,
        onClose
    }: {
        housingList: Housing[],
        onSubmit: (housingId: string, campaignHousingUpdate: HousingUpdate) => void,
        onClose: () => void
    }) => {

    const dispatch = useDispatch();
    const statusFormRef = useRef<{validate: () => void}>();
    const campaignList = useCampaignList();

    const [housing, setHousing] = useState<Housing>();
    const [campaignId, setCampaignId] = useState<string>();
    const [campaignOptions, setCampaignOptions] = useState<SelectOption[]>();

    useEffect(() => {
        if (housingList.length === 1) {
            selectHousing(housingList[0].id)
        }
    },[dispatch])


    const housingOptions = housingList.length === 1 ? [{value: housingList[0].id, label: housingList[0].rawAddress.join(' - ')}] : [
        DefaultOption,
        ...housingList.map((housing, index) => (
            {value: housing.id, label: [`Logement ${index + 1}`, ...housing.rawAddress].join(' - ')}
        ))
    ];

    const selectHousing = (housingId: string) => {
        const housing = housingList.find(_ => _.id === housingId)
        if (housing) {
            setHousing(housing);
            if (housing.campaignIds.length === 0) {
                setCampaignId(undefined)
                setCampaignOptions([
                    DefaultOption,
                    ...campaignList?.map(campaign => ({
                        value: campaign.id,
                        label: campaign.name
                    })) ?? []
                ])
            }
            else if (housing.campaignIds.length === 1) {
                setCampaignId(housing.campaignIds[0])
                setCampaignOptions(undefined);
            } else {
                setCampaignId(undefined)
                setCampaignOptions([
                    DefaultOption,
                    ...housing.campaignIds.map(campaignId => ({
                        value: campaignId,
                        label: campaignList?.find(campaign => campaign.id === campaignId)?.name ?? ''
                    }))
                ])
            }
        }
    }

    const submit = (housingUpdate: HousingUpdate) => {
        if (housing) {
            onSubmit(housing.id, {...housingUpdate, campaignId})
        }
    }

    const hasCampaign = () => {
        return housingList.filter(_ => _.campaignIds.length).length > 0;
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
                            selected={housing?.id}
                            onChange={(e: any) => selectHousing(e.target.value)}/>
                    }
                    {campaignOptions && <>
                        {!hasCampaign() &&
                                <span>
                                <b>Ce propriétaire n’est pas présent dans la liste des propriétaires suivis actuellement</b>
                                <br/>Vous pouvez l’ajouter à une des listes suivantes :
                            </span>
                        }
                        <Select
                            label={hasCampaign() ? 'Campagne' : 'Liste'}
                            options={campaignOptions}
                            selected={campaignId}
                            onChange={(e: any) => setCampaignId(e.target.value)}/>
                    </>}
                    {housing &&
                        <HousingStatusForm previousStatus={housing.status}
                                           previousSubStatus={housing.subStatus}
                                           previousPrecision={housing.precision}
                                           onValidate={submit}
                                           ref={statusFormRef}/>
                    }
                </Container>
            </ModalContent>
            <ModalFooter>
                <Button title="Annuler"
                        secondary
                        className="fr-mr-2w"
                        onClick={() => onClose()}>
                    Annuler
                </Button>
                {campaignOptions?.length !== 1 &&
                    <Button title="Enregistrer"
                            onClick={() => statusFormRef.current?.validate()}>
                        Enregistrer
                    </Button>
                }
            </ModalFooter>
        </Modal>
    );
};

export default HousingStatusModal;

