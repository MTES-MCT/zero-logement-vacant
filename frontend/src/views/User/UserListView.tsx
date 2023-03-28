import React, { useEffect, useState } from 'react';

import {
  Button,
  Col,
  Container,
  Link,
  Row,
  Table,
  Title,
} from '@dataesr/react-dsfr';
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';
import {
  changeUserFiltering,
  changeUserPagination,
  removeUser,
} from '../../store/actions/userAction';
import { User } from '../../models/User';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import FilterBadges from '../../components/FiltersBadges/FiltersBadges';
import { displayCount, stringSort } from '../../utils/stringUtils';
import { useAvailableEstablishmentOptions } from '../../hooks/useAvailableEstablishmentOptions';
import { dateSort } from '../../utils/dateUtils';
import styles from './user-list.module.scss';
import ConfirmationModal from '../../components/modals/ConfirmationModal/ConfirmationModal';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useUser } from '../../hooks/useUser';
import Help from '../../components/Help/Help';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import EstablishmentSearchableSelect from '../../components/EstablishmentSearchableSelect/EstablishmentSearchableSelect';

const UserListView = () => {
  useDocumentTitle('Utilisateurs');
  const dispatch = useAppDispatch();
  const { isAdmin } = useUser();
  const availableEstablishmentOptions = useAvailableEstablishmentOptions();

  const [isRemovingUserModalOpen, setIsRemovingUserModalOpen] =
    useState<string>();
  const { availableEstablishments } = useAppSelector(
    (state) => state.authentication
  );
  const { paginatedUsers, filters } = useAppSelector((state) => state.user);

  useEffect(() => {
    dispatch(changeUserPagination(0, 500));
  }, [dispatch]);

  const onChangeFilters = (changedFilters: any) => {
    dispatch(
      changeUserFiltering({
        ...filters,
        ...changedFilters,
      })
    );
  };

  const removeFilter = (removedFilter: any) => {
    dispatch(
      changeUserFiltering({
        ...filters,
        ...removedFilter,
      })
    );
  };

  const onRemoveUser = (id: User['id']) => {
    dispatch(removeUser(id));
    setIsRemovingUserModalOpen(undefined);
  };

  const nameColumn = {
    name: 'name',
    label: 'Nom',
    render: ({ firstName, lastName }: User) => (
      <>
        {lastName} {firstName}
      </>
    ),
    sortable: true,
    sort: (u1: User, u2: User) =>
      stringSort(u1.lastName + u1.firstName, u2.lastName + u2.firstName),
  };

  const emailColumn = {
    name: 'email',
    label: 'Email',
    render: ({ email }: User) => <>{email}</>,
    sortable: true,
  };

  const establishmentColumn = {
    name: 'establishment',
    label: 'Collectivité',
    render: ({ establishmentId }: User) => (
      <>
        {availableEstablishments?.find((e) => e.id === establishmentId)?.name}
      </>
    ),
    sortable: true,
    sort: (u1: User, u2: User) =>
      stringSort(
        availableEstablishments?.find((e) => e.id === u1.establishmentId)?.name,
        availableEstablishments?.find((e) => e.id === u2.establishmentId)?.name
      ),
  };

  const stateColumn = {
    name: 'state',
    label: "Date d'activation",
    render: ({ activatedAt }: User) => (
      <>{format(activatedAt, 'dd MMMM yyyy', { locale: fr })}</>
    ),
    sortable: true,
    sort: (u1: User, u2: User) => dateSort(u1.activatedAt, u2.activatedAt),
  };

  const deletionColumn = {
    name: 'delete',
    headerRender: () => '',
    render: ({ id }: User) => (
      <span className={styles.actions}>
        <Button
          title="Supprimer l'utilisateur(rice)"
          data-testid="remove-user-button"
          secondary
          onClick={() => setIsRemovingUserModalOpen(id)}
          className={styles.borderless}
          icon="ri-delete-bin-fill"
        />
        {isRemovingUserModalOpen === id && (
          <ConfirmationModal
            onSubmit={() => onRemoveUser(id)}
            onClose={() => setIsRemovingUserModalOpen(undefined)}
          >
            Êtes-vous sûr de vouloir supprimer cet(te) utilisateur(rice) ?
          </ConfirmationModal>
        )}
      </span>
    ),
  };

  const columns = isAdmin
    ? [
        nameColumn,
        emailColumn,
        establishmentColumn,
        stateColumn,
        deletionColumn,
      ]
    : [nameColumn, emailColumn];

  return (
    <>
      <div className="bg-100">
        <Container as="section" spacing="py-4w">
          <AppBreadcrumb />
          <Row>
            <Col n="8">
              <Title as="h1">Utilisateurs</Title>
            </Col>
            {isAdmin && (
              <Col>
                <EstablishmentSearchableSelect
                  onChange={(id: string) =>
                    onChangeFilters({ establishmentIds: id ? [id] : undefined })
                  }
                />
              </Col>
            )}
          </Row>
          {!isAdmin && (
            <Help>
              Vous avez la possibilité de supprimer ou de rattacher des
              utilisateurs sur votre espace 
              <Link
                href="https://consultdf.cerema.fr/consultdf/orion-cerema/login"
                target="_blank"
              >
                Consultdf
              </Link>
            </Help>
          )}
        </Container>
      </div>
      <Container as="section" spacing="py-4w">
        <Row>
          <FilterBadges
            filters={filters.establishmentIds}
            options={availableEstablishmentOptions}
            onChange={(values) => removeFilter({ establishmentIds: values })}
          />
        </Row>

        {paginatedUsers && (
          <>
            {!paginatedUsers.loading && (
              <Row alignItems="middle" className="fr-py-1w">
                <Col>
                  <b>
                    {displayCount(paginatedUsers.filteredCount, 'utilisateur')}
                  </b>
                </Col>
              </Row>
            )}

            {paginatedUsers.filteredCount > 0 && (
              <Table
                caption="Utilisateurs"
                captionPosition="none"
                rowKey="id"
                data={paginatedUsers.entities.map((_, index) => ({
                  ..._,
                  rowNumber:
                    (paginatedUsers.page - 1) * paginatedUsers.perPage +
                    index +
                    1,
                }))}
                columns={columns}
                fixedLayout={true}
              />
            )}
          </>
        )}
      </Container>
    </>
  );
};

export default UserListView;
