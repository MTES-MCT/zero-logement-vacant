import { Col, Row, Text } from '../../components/dsfr/index';
import classNames from 'classnames';
import { Selection, useSelection } from '../../hooks/useSelection';
import { OwnerProspect, OwnerProspectSort } from '../../models/OwnerProspect';
import styles from './inbox-message-list.module.scss';
import { dateShortFormatWithMinutes } from '../../utils/dateUtils';
import { useSort } from '../../hooks/useSort';
import React from 'react';
import ExtendedToggle from '../ExtendedToggle/ExtendedToggle';
import ButtonLink from '../ButtonLink/ButtonLink';
import { pluralize } from '../../utils/stringUtils';
import AppCheckbox from '../AppCheckbox/AppCheckbox';
import { Table } from '../dsfr';

interface Props {
  messages: OwnerProspect[];
  onChange?: (ownerProspect: OwnerProspect) => void;
  onDisplay?: (ownerProspect: OwnerProspect) => void;
  onSelect?: (selection: Selection) => void;
  onSort?: (sort: OwnerProspectSort) => void | Promise<void>;
}

function InboxMessageList(props: Props) {
  const { cycleSort, getIcon } = useSort<OwnerProspectSort>({
    onSort: props.onSort,
  });

  const total = props.messages.length;
  const unread = props.messages.filter((message) => !message.read).length;
  const selection = useSelection(total);

  function splitAddress(fullAddress: string): string[] {
    const zipcode = fullAddress.search(/\d{5}/);
    return zipcode >= 0
      ? [fullAddress.substring(0, zipcode), fullAddress.substring(zipcode)]
      : [fullAddress];
  }

  const columns = [
    {
      name: 'select',
      headerRender: () => (
        <AppCheckbox
          checked={selection.hasSelected}
          className={selection.selected.ids.length > 0 ? 'indeterminate' : ''}
          label=""
          onChange={() => selection.toggleSelectAll()}
        />
      ),
      render: ({ id }: { id: string }) => (
        <AppCheckbox
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
        <div className={classNames(styles.address, 'ellipsis')}>
          {!owner.read && <span className={styles.chip} />}
          <div className={styles.addressLines}>
            {splitAddress(owner.address).map((address) => (
              <Text bold={!owner.read}>{address}</Text>
            ))}
          </div>
        </div>
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
          <Text className="ellipsis">
            {owner.firstName} {owner.lastName}
          </Text>
          <Text className={classNames('ellipsis', styles.subtitle)}>
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
          icon="fr-icon-phone-fill"
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
        <ButtonLink
          iconId="fr-icon-arrow-right-line"
          iconPosition="right"
          isSimple
          onClick={() => props.onDisplay?.({ ...owner, read: true })}
        >
          Afficher le message
        </ButtonLink>
      ),
    },
  ];

  return (
    <>
      <Row spacing="mb-2w">
        <Col>
          <Text as="span">
            {props.messages.length} {pluralize(total)('message')} dont 
            <Text as="span" bold>
              {unread} non {pluralize(unread)('lu')}
            </Text>
          </Text>
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
