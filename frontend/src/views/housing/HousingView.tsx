import React, { useEffect } from 'react';

import { Checkbox, Col, Container, Row, SideMenu, SideMenuItem, Text } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { listHousing } from '../../store/actions/housingAction';


const HousingView = () => {

    const dispatch = useDispatch();

    const { housingList } = useSelector((state: ApplicationState) => state.housing);

    useEffect(() => {Use
        dispatch(listHousing());
    }, [dispatch]);

    return (
        <>
            <Container spacing="py-4w">
                <Row>
                    <Col n="3">

                        <SideMenu title="Filtres" buttonLabel="filters">
                            <SideMenuItem title="Propriétaires">
                                <Checkbox
                                    value="0"
                                    onChange={() => {}}
                                    label="Particulier"
                                />
                                <Checkbox
                                    value="1"
                                    onChange={() => {}}
                                    label="Investisseur"
                                />
                                <Checkbox
                                    value="2"
                                    onChange={() => {}}
                                    label="SCI"
                                />
                                <Checkbox
                                    value="3"
                                    onChange={() => {}}
                                    label="Public"
                                />
                                <Checkbox
                                    value="4"
                                    onChange={() => {}}
                                    label="Autres"
                                />
                            </SideMenuItem>
                        </SideMenu>


                    </Col>
                    <Col>
                        <Text size="lead">Logements vacants</Text>
                        { housingList.map(housing => (
                            <Row>
                                <Col>
                                    { housing.address }
                                </Col>
                                <Col>
                                    { housing.owner }
                                </Col>
                            </Row>
                        ))}
                    </Col>
                </Row>
            </Container>
        </>
    );
};

export default HousingView;

