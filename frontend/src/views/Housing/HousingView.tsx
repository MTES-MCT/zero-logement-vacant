import React from 'react';
import { Col, Container, Row } from '@dataesr/react-dsfr';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import OwnerCard from '../../components/OwnerCard/OwnerCard';
import OwnerDetailsCard from '../../components/OwnerDetailsCard/OwnerDetailsCard';
import { useHousing } from '../../hooks/useHousing';
import HousingDetailsCard from '../../components/HousingDetailsCard/HousingDetailsCard';

const HousingView = () => {

    const { housing, mainHousingOwner } = useHousing();

    return (
        <>
            <Container as="main" className="bg-100" fluid>
                <Container as="section">
                    <Row>
                        <AppBreadcrumb />
                    </Row>
                    <Row alignItems="top" gutters spacing="mt-3w mb-0">
                        <Col n="4">
                            {mainHousingOwner && <>
                                <OwnerCard owner={mainHousingOwner}/>
                                <OwnerDetailsCard owner={mainHousingOwner} onModify={() => {}} />
                            </>}
                        </Col>
                        <Col n="8">
                            {housing && <>
                                <HousingDetailsCard housing={housing} />
                            </>}
                        </Col>
                    </Row>
                </Container>
            </Container>
        </>
    );
};

export default HousingView;

