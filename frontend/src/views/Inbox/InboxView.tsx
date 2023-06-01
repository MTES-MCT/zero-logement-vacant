import { Container } from '@dataesr/react-dsfr';
import PageIntro from '../../components/PageIntro/PageIntro';
import InboxMessageList from '../../components/Inbox/InboxMessageList';
import { Selection } from '../../hooks/useSelection';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import { useEffect, useMemo, useState } from 'react';
import {
  findOwnerProspects,
  updateOwnerProspect,
} from '../../store/actions/ownerProspectAction';
import { OwnerProspect, OwnerProspectSort } from '../../models/OwnerProspect';
import InboxSidemenu from '../../components/Inbox/InboxSidemenu';
import InternalLink from '../../components/InternalLink/InternalLink';
import { getEstablishmentUrl } from '../../models/Establishment';
import styles from './inbox-view.module.scss';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

function InboxView() {
  useDocumentTitle('Messagerie');
  const [selected, setSelected] = useState<string>();
  const dispatch = useAppDispatch();
  const establishment = useAppSelector(
    (state) => state.authentication.authUser?.establishment
  );
  const messages = useAppSelector<OwnerProspect[]>(
    (state) => state.ownerProspect.ownerProspects?.entities ?? []
  );

  const expand = useMemo<boolean>(() => !!selected, [selected]);
  const link = establishment ? getEstablishmentUrl(establishment) : null;
  const selectedOwnerProspect = useMemo<OwnerProspect | undefined>(
    () => messages.find((message) => message.id === selected),
    [messages, selected]
  );

  function onChange(ownerProspect: OwnerProspect): void {
    dispatch(updateOwnerProspect(ownerProspect));
  }

  function onClose(): void {
    setSelected(undefined);
  }

  function onDisplay(ownerProspect: OwnerProspect): void {
    dispatch(updateOwnerProspect(ownerProspect));
    setSelected(ownerProspect.id);
  }

  function onSelect(selection: Selection): void {
    console.log(selection);
  }

  function onSort(sort: OwnerProspectSort): void {
    dispatch(
      findOwnerProspects({
        sort,
      })
    );
  }

  useEffect(() => {
    dispatch(findOwnerProspects());
  }, [dispatch]);

  return (
    <Container as="main" fluid>
      <PageIntro
        description={
          <>
            Dans cet onglet, vous pourrez consulter les messages des
            propriétaires qui souhaitent vous faire part de leur situation. Ces
            messages proviennent du formulaire de contact présent sur la
            {link ? (
              <InternalLink
                className={styles.link}
                display="flex"
                isSimple
                to={link}
              >
                page publique d’information sur la vacance
              </InternalLink>
            ) : (
              'page publique d’information sur la vacance'
            )}
            .
          </>
        }
        title="Messagerie"
      />
      <Container as="article" spacing="py-4w">
        <InboxMessageList
          messages={messages}
          onChange={onChange}
          onDisplay={onDisplay}
          onSelect={onSelect}
          onSort={onSort}
        />
        <InboxSidemenu
          expand={expand}
          onChange={onChange}
          onClose={onClose}
          ownerProspect={selectedOwnerProspect}
        />
      </Container>
    </Container>
  );
}

export default InboxView;
