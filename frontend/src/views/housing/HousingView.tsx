import React, { ChangeEvent, useEffect, useState } from 'react';

import { Checkbox, Col, Container, Row, SideMenu, SideMenuItem, Title } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { listHousing } from '../../store/actions/housingAction';


const HousingView = () => {

    const dispatch = useDispatch();

    const [filters, setFilters] = useState<{ ownerKinds?: string[] }>({});

    const { housingList } = useSelector((state: ApplicationState) => state.housing);

    useEffect(() => {
        dispatch(listHousing(filters.ownerKinds));
    }, [filters, dispatch])

    const changeOwnerKindsFilter = (value: string, checked: boolean) => {
        const valueIndex = (filters.ownerKinds ?? []).indexOf(value);
        if (checked && valueIndex === -1) {
            setFilters({ ownerKinds: [...filters.ownerKinds ?? [], value] })
        } else if (!checked && valueIndex !== -1) {
            setFilters( { ownerKinds: (filters.ownerKinds ?? []).filter(f => f !== value)})
        }
    }

    return (
        <>
            <Container spacing="py-4w">
                <Title as="h1">Tous les logements</Title>
                <Row>
                    <Col n="2">
                        <SideMenu title="Filtres" buttonLabel="filters">
                            <SideMenuItem title="Propriétaires" data-testid="owners-filter">
                                <Checkbox
                                    value="Particulier"
                                    onChange={(e: ChangeEvent<any>) => changeOwnerKindsFilter(e.target.value, e.target.checked)}
                                    label="Particulier"
                                    data-testid="owners-filter1"
                                />
                                <Checkbox
                                    value="Investisseur"
                                    onChange={(e: ChangeEvent<any>) => changeOwnerKindsFilter(e.target.value, e.target.checked)}
                                    label="Investisseur"
                                    data-testid="owners-filter2"
                                />
                                <Checkbox
                                    value="SCI"
                                    onChange={(e: ChangeEvent<any>) => changeOwnerKindsFilter(e.target.value, e.target.checked)}
                                    label="SCI"
                                />
                                <Checkbox
                                    value="Autres"
                                    onChange={(e: ChangeEvent<any>) => changeOwnerKindsFilter(e.target.value, e.target.checked)}
                                    label="Autres"
                                />
                            </SideMenuItem>
                        </SideMenu>


                    </Col>
                    <Col>
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

