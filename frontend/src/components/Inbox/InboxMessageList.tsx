import { Checkbox, Col, Row, Table, Text } from '@dataesr/react-dsfr';
import classNames from 'classnames';
import { Selection, useSelection } from '../../hooks/useSelection';
import { OwnerProspect, OwnerProspectSort } from '../../models/OwnerProspect';
import InternalLink from '../InternalLink/InternalLink';
import AppSearchBar from '../AppSearchBar/AppSearchBar';
import styles from './inbox-message-list.module.scss';
import { dateShortFormatWithMinutes } from '../../utils/dateUtils';
import { useSort } from '../../hooks/useSort';
import React from 'react';
import ExtendedToggle from '../ExtendedToggle/ExtendedToggle';

interface Props {
  messages: OwnerProspect[];
  onChange?: (ownerProspect: OwnerProspect) => void;
  onSelect?: (selection: Selection) => void;
  onSearch?: (value: string) => void;
  onSort?: (sort: OwnerProspectSort) => void | Promise<void>;
}

function InboxMessageList(props: Props) {
  const selection = useSelection();
  const { cycleSort, getIcon } = useSort<OwnerProspectSort>({
    onSort: props.onSort,
  });

  const columns = [
    {
      name: 'select',
      headerRender: () => (
        <Checkbox
          checked={selection.hasSelected}
          className={selection.selected.ids.length > 0 ? 'indeterminate' : ''}
          label=""
          onChange={(e) => selection.toggleSelectAll()}
        />
      ),
      render: ({ id }: { id: string }) => (
        <Checkbox
          checked={selection.isSelected(id)}
          label=""
          onChange={() => selection.toggleSelect(id)}
          value={id}
        />
      ),
    },
    {
      name: 'address',
      headerRender: () => (
        <div style={{ cursor: 'pointer' }} onClick={() => cycleSort('address')}>
          Adresse du logement {getIcon('address')}
        </div>
      ),
      render: (owner: OwnerProspect) => (
        <Text className={styles.ellipsis}>{owner.address}</Text>
      ),
    },
    {
      name: 'contact',
      headerRender: () => (
        <div style={{ cursor: 'pointer' }} onClick={() => cycleSort('email')}>
          Contact {getIcon('email')}
        </div>
      ),
      render: (owner: OwnerProspect) => (
        <>
          <Text className={styles.ellipsis}>
            {owner.firstName} {owner.lastName}
          </Text>
          <Text className={classNames(styles.ellipsis, styles.subtitle)}>
            {owner.email}
          </Text>
        </>
      ),
    },
    {
      name: 'status',
      headerRender: () => 'Statut',
      render: (owner: OwnerProspect) => (
        <ExtendedToggle
          checked={owner.callBack}
          className="fr-mt-0"
          label="À recontacter"
          icon="ri-phone-fill"
          onChange={(checked) =>
            props.onChange?.({ ...owner, callBack: checked })
          }
          toggleColor="#4a9df7"
          vertical
        />
      ),
    },
    {
      name: 'inbox',
      headerRender: () => (
        <div
          style={{ cursor: 'pointer' }}
          onClick={() => cycleSort('createdAt')}
        >
          Date de réception {getIcon('createdAt')}
        </div>
      ),
      render: (owner: OwnerProspect) => (
        <>
          {owner.createdAt && (
            <Text className={styles.subtitle}>
              Reçu le {dateShortFormatWithMinutes(new Date(owner.createdAt))}
            </Text>
          )}
        </>
      ),
    },
    {
      name: 'action',
      headerRender: () => '',
      render: (owner: OwnerProspect) => (
        <InternalLink
          display="flex"
          icon="ri-arrow-right-line"
          iconSize="1x"
          iconPosition="right"
          isSimple
          to="logements"
        >
          Afficher la fiche contact
        </InternalLink>
      ),
    },
  ];

  function onSearch(value: string): void {
    props.onSearch?.(value);
  }

  async function onKeySearch(value: string): Promise<void> {
    props.onSearch?.(value);
  }

  return (
    <>
      <Row spacing="my-2w">
        <Col></Col>
        <Col n="3">
          <AppSearchBar onKeySearch={onKeySearch} onSearch={onSearch} />
        </Col>
      </Row>
      <Row>
        <Col n="12">
          <Table
            caption="Boite de réception"
            captionPosition="none"
            className={classNames(styles.table, {
              'with-select': props.onSelect,
            })}
            columns={columns}
            data={props.messages}
            fixedLayout
            rowKey={(message: OwnerProspect) => message.id}
            pagination
            paginationPosition="center"
          />
        </Col>
      </Row>
    </>
  );
}

export default InboxMessageList;
