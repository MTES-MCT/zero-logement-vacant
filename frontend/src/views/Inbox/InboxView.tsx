import { Container, Text } from '../../components/_dsfr';
import InboxMessageList from '../../components/Inbox/InboxMessageList';
import { Selection } from '../../hooks/useSelection';

import { useAppSelector } from '../../hooks/useStore';
import React, { useMemo, useState } from 'react';

import { OwnerProspect, OwnerProspectSort } from '../../models/OwnerProspect';
import InboxSidemenu from '../../components/Inbox/InboxSidemenu';
import AppLink from '../../components/_app/AppLink/AppLink';
import { getEstablishmentUrl } from '../../models/Establishment';
import styles from './inbox-view.module.scss';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

import MainContainer from '../../components/MainContainer/MainContainer';

import {
  useFindOwnerProspectsQuery,
  useUpdateOwnerProspectMutation,
} from '../../services/owner-prospect.service';

function InboxView() {
  useDocumentTitle('Messagerie');
  const [selected, setSelected] = useState<string>();
  const establishment = useAppSelector(
    (state) => state.authentication.authUser?.establishment
  );
  const [sort, setSort] = useState<OwnerProspectSort>();

  const [updateOwnerProspect] = useUpdateOwnerProspectMutation();

  const { data: ownerProspects } = useFindOwnerProspectsQuery({
    options: { sort },
  });

  const messages = useMemo(
    () => ownerProspects?.entities ?? [],
    [ownerProspects]
  );

  const expand = useMemo<boolean>(() => !!selected, [selected]);
  const link = establishment ? getEstablishmentUrl(establishment) : null;
  const selectedOwnerProspect = useMemo<OwnerProspect | undefined>(
    () => messages.find((message) => message.id === selected),
    [messages, selected]
  );

  async function onChange(ownerProspect: OwnerProspect): Promise<void> {
    updateOwnerProspect(ownerProspect);
  }

  function onClose(): void {
    setSelected(undefined);
  }

  async function onDisplay(ownerProspect: OwnerProspect): Promise<void> {
    await updateOwnerProspect(ownerProspect);
    setSelected(ownerProspect.id);
  }

  function onSelect(selection: Selection): void {
    console.log(selection);
  }

  return (
    <MainContainer title="Messagerie">
      <Text size="lg">
        Dans cette page, vous pourrez consulter les messages des propriétaires
        qui souhaitent vous faire part de leur situation. Ces messages
        proviennent du formulaire de contact présent sur la 
        {link ? (
          <AppLink className={styles.link} isSimple to={link} target="_blank">
            page publique d’information sur la vacance
          </AppLink>
        ) : (
          'page publique d’information sur la vacance'
        )}
        .
      </Text>
      <Container as="article" spacing="py-4w px-0">
        <InboxMessageList
          messages={messages}
          onChange={onChange}
          onDisplay={onDisplay}
          onSelect={onSelect}
          onSort={setSort}
        />
        <InboxSidemenu
          expand={expand}
          onChange={onChange}
          onClose={onClose}
          ownerProspect={selectedOwnerProspect}
        />
      </Container>
    </MainContainer>
  );
}

export default InboxView;
