import React, { useEffect, useState } from 'react';

import { Col, Container, Row, SideMenu, SideMenuItem, Checkbox, Text } from '@dataesr/react-dsfr';
import housingService from '../../services/housing.service';
import { Housing } from '../../models/Housing';


const HousingView = () => {

    const [housingList, setHousingList] = useState<Housing[]>([])

    useEffect(() => {
        housingService.listHousing().then(housingList => {
            setHousingList(housingList ?? []);
        });
    }, []);

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

