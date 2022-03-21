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
import { DefaultOption } from '../../../models/SelectOption';
import { useDispatch } from 'react-redux';
import HousingStatusForm from './HousingStatusForm';

const HousingStatusModal = (
    {
        housingList,
        onSubmit,
        onClose
    }: {
        housingList: Housing[],
        onSubmit: (housing: Housing, campaignHousingUpdate: HousingUpdate) => void,
        onClose: () => void
    }) => {

    const dispatch = useDispatch();
    const statusFormRef = useRef<{validate: () => void}>();

    const [housing, setHousing] = useState<Housing>();

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
        setHousing(housingList.find(_ => _.id === housingId));
    }

    const submit = (housingUpdate: HousingUpdate) => {
        if (housing) {
            onSubmit(housing, housingUpdate)
        }
    }

    const hasCampaign = () => {
        return housing && housing.campaignIds.length > 0;
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
                    {housing && !hasCampaign() &&
                        <div className="fr-pb-2w">
                            <b>Ce logement n’est pas présent dans la liste des logements suivis actuellement</b>
                        </div>
                    }
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
                {
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

