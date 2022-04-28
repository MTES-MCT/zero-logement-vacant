import React from 'react';

import { Col, Container, Row } from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import AppMultiSelect from '../../components/AppMultiSelect/AppMultiSelect';
import { SelectOption } from '../../models/SelectOption';
import { changeUserFiltering } from '../../store/actions/userAction';


const UserListFilter = ({ availableEstablishmentOptions }: { availableEstablishmentOptions: SelectOption[] }) => {

    const dispatch = useDispatch();

    const { filters } = useSelector((state: ApplicationState) => state.user);

    const onChangeFilters = (changedFilters: any) => {
        dispatch(changeUserFiltering({
            ...filters,
            ...changedFilters
        }))
    }

    return (
        <Container fluid>
            <div>
                <Row gutters>
                    <Col n="3">
                        <AppMultiSelect label="Etablissement"
                                        options={availableEstablishmentOptions}
                                        initialValues={filters.establishmentIds}
                                        onChange={(values) => onChangeFilters({establishmentIds: values})}/>
                    </Col>
                </Row>
            </div>
        </Container>
    );
};

export default UserListFilter;

