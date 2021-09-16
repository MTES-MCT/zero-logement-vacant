import React, { useEffect, useState } from 'react';

import { Col, Container, Row } from '@dataesr/react-dsfr';
import housingService from '../../services/housing.service';


const HousingView = () => {

    const [housingList, setHousingList] = useState([])

    useEffect(() => {
        housingService.listHousing().then(records => {
            setHousingList(records ?? []);
        });
    }, housingList);

    return (
        <>
            <Container>
                <Row>
                    <Col n="2">Filtres</Col>
                    <Col>
                        { housingList.map((housing: any) => (
                            <Row>
                                <Col>
                                    { housing.fields.ADRESSE1 }
                                </Col>
                                <Col>
                                    { housing.fields.ADRESSE2 }
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

