import React, { ChangeEvent, useState } from 'react';

import {
    Button,
    Col,
    Container,
    Row,
    Title,
    Modal,
    ModalClose,
    ModalTitle,
    ModalContent,
    ModalFooter,
    TextInput, Text,
} from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingListFilterMenu from './HousingListFilterMenu';
import HousingList from '../../components/HousingList/HousingList';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import { searchHousing } from '../../store/actions/housingAction';
import { createCampaign } from '../../store/actions/campaignAction';


const HousingListView = () => {

    const dispatch = useDispatch();

    const { housingList } = useSelector((state: ApplicationState) => state.housing);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [campaignName, setCampaignName] = useState('');

    const [selectedHousingIds, setSelectedHousingIds] = useState<string[]>([]);

    const create = () => {
        dispatch(createCampaign(campaignName, selectedHousingIds))
        setIsModalOpen(false)
    }

    return (
        <Container spacing="py-4w">
            <Row className="fr-grid-row--center">
                <Col n="3">
                    <HousingListFilterMenu />
                </Col>
                <Col>
                    <Row className="fr-grid-row--middle">
                        <Col n="4">
                            <Title as="h1">Logements</Title>
                        </Col>
                        <Col n="4">
                            <AppSearchBar onSearch={(input: string) => {dispatch(searchHousing(input))}} />
                        </Col>
                        <Col n="4">
                            <div style={{textAlign: 'right'}}>
                                <Button title="open modal" onClick={() => setIsModalOpen(true)}>Créer la campagne</Button>
                                <Modal isOpen={isModalOpen} hide={() => setIsModalOpen(false)}>
                                    <ModalClose hide={() => setIsModalOpen(false)} title="Fermer la fenêtre">Fermer</ModalClose>
                                    <ModalTitle>Créer la campagne</ModalTitle>
                                    <ModalContent>
                                        <Text size="md" className="fr-mb-1w">
                                            {selectedHousingIds.length} logements sélectionnés
                                        </Text>
                                        <TextInput
                                            value={campaignName}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setCampaignName(e.target.value)}
                                            required
                                            label="Nom de la campagne"
                                            hint="20 caractères maximum"
                                        />
                                    </ModalContent>
                                    <ModalFooter>
                                        <Button title="title" onClick={() => create()}>Créer la campagne</Button>
                                    </ModalFooter>
                                </Modal>
                            </div>
                        </Col>

                    </Row>
                    <HousingList housingList={housingList} onSelect={(ids: string[]) => setSelectedHousingIds(ids)}/>
                </Col>
            </Row>
        </Container>
    );
};

export default HousingListView;

