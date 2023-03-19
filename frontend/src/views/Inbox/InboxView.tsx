import { Container } from '@dataesr/react-dsfr';
import PageIntro from '../../components/PageIntro/PageIntro';
import InboxMessageList from '../../components/Inbox/InboxMessageList';
import { Selection } from '../../hooks/useSelection';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import { useEffect } from 'react';
import {
  findOwnerProspects,
  updateOwnerProspect,
} from '../../store/actions/ownerProspectAction';
import { OwnerProspect, OwnerProspectSort } from '../../models/OwnerProspect';

function InboxView() {
  const dispatch = useAppDispatch();
  const messages = useAppSelector<OwnerProspect[]>(
    (state) => state.ownerProspect.ownerProspects?.entities ?? []
  );

  function onChange(ownerProspect: OwnerProspect): void {
    dispatch(updateOwnerProspect(ownerProspect));
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
      <PageIntro description="Lorem ipsum dolor sit amet consectetur. Amet sem enim diam ultricies tortor.Lorem ipsum dolor sit amet consectetur. Amet sem enim diam ultricies tortor." />
      <Container as="article" spacing="py-4w">
        <InboxMessageList
          messages={messages}
          onChange={onChange}
          onSelect={onSelect}
          onSort={onSort}
        />
      </Container>
    </Container>
  );
}

export default InboxView;
