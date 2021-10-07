import React from 'react';

import { Col, Container, Row, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingListFilterMenu from './HousingListFilterMenu';
import HousingList from '../../components/HousingList/HousingList';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import { searchHousing } from '../../store/actions/housingAction';


const HousingListView = () => {

    const dispatch = useDispatch();

    const { housingList } = useSelector((state: ApplicationState) => state.housing);

    return (
        <Container spacing="py-4w">
            <Row className="fr-grid-row--center">
                <Col n="3">
                    <HousingListFilterMenu />
                </Col>
                <Col>
                    <Title as="h1">Logements</Title>
                    <Row>
                        <Col n="6">
                            <AppSearchBar onSearch={(input: string) => {dispatch(searchHousing(input))}} />
                        </Col>

                    </Row>
                    <HousingList housingList={housingList} />
                </Col>
            </Row>
        </Container>
    );
};

export default HousingListView;

