import React, { useEffect, useState } from 'react';

import { Button, Col, Container, Row, Table, Title } from '@dataesr/react-dsfr';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { useDispatch, useSelector } from 'react-redux';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import {
    changeUserFiltering,
    changeUserPagination,
    createUser,
    sendActivationMail,
} from '../../store/actions/userAction';
import { DraftUser, User } from '../../models/User';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import UserCreationModal from '../../components/modals/UserCreationModal/UserCreationModal';
import FilterBadges from '../../components/FiltersBadges/FiltersBadges';
import { displayCount, stringSort } from '../../utils/stringUtils';
import AppMultiSelect from '../../components/AppMultiSelect/AppMultiSelect';
import { useAvailableEstablishmentOptions } from '../../hooks/useAvailableEstablishmentOptions';
import { dateSort } from '../../utils/dateUtils';

const UserListView = () => {

    const dispatch = useDispatch();
    const availableEstablishmentOptions = useAvailableEstablishmentOptions();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { availableEstablishments } = useSelector((state: ApplicationState) => state.authentication);
    const { paginatedUsers, filters } = useSelector((state: ApplicationState) => state.user);

    useEffect(() => {
        dispatch(changeUserPagination(0, 500))
    }, [dispatch])


    const onChangeFilters = (changedFilters: any) => {
        dispatch(changeUserFiltering({
            ...filters,
            ...changedFilters
        }))
    }

    const onSubmitDraftUser = (draftUser: DraftUser) => {
        dispatch(createUser(draftUser))
        setIsCreateModalOpen(false)
    }

    const removeFilter = (removedFilter: any) => {
        dispatch(changeUserFiltering({
            ...filters,
            ...removedFilter,
        }));
    }

    const nameColumn = {
        name: 'name',
        label: 'Nom',
        render: ({ firstName, lastName }: User) =>
            <>
                {lastName} {firstName}
            </>,
        sortable: true,
        sort: (u1: User, u2: User) => stringSort(u1.lastName + u1.firstName, u2.lastName + u2.firstName)
    };

    const emailColumn = {
        name: 'email',
        label: 'Email',
        render: ({ email }: User) =>
            <>
                {email}
            </>,
        sortable: true
    };

    const establishmentColumn = {
        name: 'establishment',
        label: 'Collectivité',
        render: ({ establishmentId }: User) =>
            <>
                {availableEstablishments?.find(e => e.id === establishmentId)?.name}
            </>,
        sortable: true,
        sort: (u1: User, u2: User) => stringSort(availableEstablishments?.find(e => e.id === u1.establishmentId)?.name, availableEstablishments?.find(e => e.id === u2.establishmentId)?.name)
    };

    const stateColumn = {
        name: 'state',
        label: 'Statut',
        render: ({ activatedAt, activationSendAt }: User) =>
            <>
                {activatedAt ?
                    'Compte activé' :
                    activationSendAt ? 'Mail d\'activation envoyé le ' + format(activationSendAt, 'dd MMMM yyyy', { locale: fr }) :
                        ''
                }
            </>,
        sortable: true,
        sort: (u1: User, u2: User) => {
            if (u1.activatedAt) {
                return u2.activatedAt ?  dateSort(u1.activatedAt, u2.activatedAt) : 1
            } else if (u1.activationSendAt) {
                return u2.activatedAt ? -1 : (u2.activationSendAt ? dateSort(u1.activationSendAt, u2.activationSendAt) : 1)
            } else {
                return (u2.activatedAt || u2.activationSendAt) ? -1 : 0
            }
        }
    };

    const activationLinkColumn = {
        name: 'view',
        headerRender: () => '',
        render: ({ id, activatedAt }: User) => <>
            {!activatedAt &&
                <Button title="Envoyer un mail d'activation"
                        size="sm"
                        secondary
                        onClick={() => {
                            dispatch(sendActivationMail(id))
                        }}>
                    Envoyer un mail d&apos;activation
                </Button>
            }
        </>
    }

    const columns = () => [nameColumn, emailColumn, establishmentColumn, stateColumn, activationLinkColumn]

    return (
        <>
            <div className="bg-100">
                <Container spacing="pb-1w">
                    <AppBreadcrumb />
                    <Row>
                        <Col n="8">
                            <Title as="h1">Utilisateurs</Title>
                        </Col>
                        <Col>
                            <AppMultiSelect label="Etablissements"
                                            options={availableEstablishmentOptions}
                                            initialValues={filters.establishmentIds}
                                            onChange={(values) => onChangeFilters({establishmentIds: values})}/>
                        </Col>
                    </Row>
                </Container>
            </div>
            <Container spacing="pt-2w">
                {isCreateModalOpen &&
                    <UserCreationModal
                        availableEstablishments={availableEstablishments ?? []}
                        onSubmit={(draftUser: DraftUser) => onSubmitDraftUser(draftUser)}
                        onClose={() => setIsCreateModalOpen(false)}/>}

                <Row>
                    <FilterBadges filters={filters.establishmentIds}
                                  options={availableEstablishmentOptions}
                                  onChange={(values) => removeFilter({ establishmentIds: values })}/>
                </Row>

                {paginatedUsers && <>

                    {!paginatedUsers.loading &&
                        <Row alignItems="middle" className="fr-py-1w">
                            <Col>
                                <b>{displayCount(paginatedUsers.totalCount, 'utilisateur')}</b>
                            </Col>
                            <Col>
                                <Button title="Ajouter un utilisateur"
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="float-right">
                                    Ajouter un utilisateur
                                </Button>
                            </Col>
                        </Row>
                    }

                    {paginatedUsers.totalCount > 0 &&
                        < Table
                            caption="Utilisateurs"
                            captionPosition="none"
                            rowKey="id"
                            data={paginatedUsers.entities.map((_, index) => ({..._, rowNumber: (paginatedUsers.page - 1) * paginatedUsers.perPage + index + 1}) )}
                            columns={columns()}
                            fixedLayout={true}
                        />
                    }

                </>}
            </Container>
        </>
    );
};

export default UserListView;

