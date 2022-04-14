import React, { useEffect } from 'react';

import { Button, Container, Table, Title } from '@dataesr/react-dsfr';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { useDispatch, useSelector } from 'react-redux';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import { changeUserPagination, sendActivationMail } from '../../store/actions/userAction';
import { User } from '../../models/User';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { fetchAvailableEstablishments } from '../../store/actions/authenticationAction';

const UserListView = () => {

    const dispatch = useDispatch();

    const { availableEstablishments } = useSelector((state: ApplicationState) => state.authentication);
    const { paginatedUsers } = useSelector((state: ApplicationState) => state.user);

    console.log('availableEstablishments', availableEstablishments)

    useEffect(() => {
        dispatch(changeUserPagination(0, 500))
        if (!availableEstablishments?.length) {
            dispatch(fetchAvailableEstablishments())
        }
    }, [dispatch]);

    const nameColumn = {
        name: 'name',
        label: 'Nom',
        render: ({ firstName, lastName }: User) =>
            <>
                {lastName} {firstName}
            </>
    };

    const emailColumn = {
        name: 'email',
        label: 'Email',
        render: ({ email }: User) =>
            <>
                {email}
            </>
    };

    const establishmentColumn = {
        name: 'establishment',
        label: 'Collectivité',
        render: ({ establishmentId }: User) =>
            <>
                {availableEstablishments?.find(e => e.id === establishmentId)?.name}
            </>
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
            </>
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
            <Container>
                <AppBreadcrumb />
                <Title as="h1" className="fr-mb-4w">Utilisateurs</Title>
                {paginatedUsers.entities?.length > 0 &&
                    <Table
                        caption="Utilisateurs"
                        captionPosition="none"
                        rowKey="id"
                        data={paginatedUsers.entities.map((_, index) => ({..._, rowNumber: (paginatedUsers.page - 1) * paginatedUsers.perPage + index + 1}) )}
                        columns={columns()}
                        fixedLayout={true}
                        data-testid="housing-table"
                    />
                }
            </Container>
        </>
    );
};

export default UserListView;

