import { Col, Row, Table, Text } from '../_dsfr';
import classNames from 'classnames';
import { Selection, useSelection } from '../../hooks/useSelection';
import { OwnerProspect, OwnerProspectSort } from '../../models/OwnerProspect';
import styles from './inbox-message-list.module.scss';
import { dateShortFormatWithMinutes } from '../../utils/dateUtils';
import { useSort } from '../../hooks/useSort';
import React from 'react';
import ExtendedToggle from '../ExtendedToggle/ExtendedToggle';
import AppLinkAsButton from '../_app/AppLinkAsButton/AppLinkAsButton';
import { pluralize } from '../../utils/stringUtils';
import AppCheckbox from '../_app/AppCheckbox/AppCheckbox';

interface Props {
  messages: OwnerProspect[];
  onChange?: (ownerProspect: OwnerProspect) => void;
  onDisplay?: (ownerProspect: OwnerProspect) => void;
  onSelect?: (selection: Selection) => void;
  onSort?: (sort: OwnerProspectSort) => void | Promise<void>;
}

function InboxMessageList(props: Props) {
  const { getSortButton } = useSort<OwnerProspectSort>({
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
      headerRender: () => getSortButton('address', 'Adresse du logement'),
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
      headerRender: () => getSortButton('email', 'Contact'),
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
          iconId="fr-icon-phone-fill"
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
      headerRender: () => getSortButton('createdAt', 'Date de réception'),
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
        <AppLinkAsButton
          iconId="fr-icon-arrow-right-line"
          iconPosition="right"
          isSimple
          onClick={() => props.onDisplay?.({ ...owner, read: true })}
        >
          Afficher le message
        </AppLinkAsButton>
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
