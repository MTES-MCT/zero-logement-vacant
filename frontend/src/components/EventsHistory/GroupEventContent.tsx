import { Event } from '../../models/Event';
import { Container, Text } from '@dataesr/react-dsfr';
import InternalLink from '../InternalLink/InternalLink';
import { useGetGroupQuery } from '../../services/group.service';
import { Group } from '../../models/Group';
import styles from './events-history.module.scss';

interface Props {
  event: Event<Group>;
}

function GroupEventContent(props: Props) {
  if (props.event.section === 'Ajout d’un logement dans un groupe') {
    return (
      <Container as="main" className={styles.eventContent} fluid>
        <GroupHousingAddedEvent event={props.event} />
      </Container>
    );
  }

  if (props.event.section === 'Retrait du logement d’un groupe') {
    return (
      <Container as="main" className={styles.eventContent} fluid>
        <GroupHousingRemovedEvent event={props.event} />
      </Container>
    );
  }

  if (props.event.section === 'Archivage d’un groupe') {
    return (
      <Container as="main" className={styles.eventContent} fluid>
        <GroupArchivedEvent event={props.event} />
      </Container>
    );
  }

  if (props.event.section === 'Suppression d’un groupe') {
    return (
      <Container as="main" className={styles.eventContent} fluid>
        <GroupRemovedEvent event={props.event} />
      </Container>
    );
  }

  return <></>;
}

function GroupHousingAddedEvent(props: Props) {
  const { data: group } = useGetGroupQuery(props.event.new?.id ?? '', {
    skip: !props.event.new?.id,
  });

  return (
    <Text size="sm" spacing="mb-0">
      Ce logement a été ajouté dans le groupe 
      {group ? (
        <InternalLink
          display="flex"
          isSimple
          size="sm"
          to={`/groupes/${group.id}`}
        >
          {group.title}
        </InternalLink>
      ) : (
        <>
          <Text as="span" className="disabled" size="sm" spacing="mb-0">
            {props.event.new?.title}
          </Text>
        </>
      )}
    </Text>
  );
}

function GroupHousingRemovedEvent(props: Props) {
  const { data: group } = useGetGroupQuery(props.event.new?.id ?? '', {
    skip: !props.event.new?.id,
  });

  return (
    <Text size="sm" spacing="mb-0">
      Ce logement a été retiré du groupe
      {group ? (
        <InternalLink
          display="flex"
          isSimple
          size="sm"
          to={`/groupes/${group.id}`}
        >
          {group.title}
        </InternalLink>
      ) : (
        <>
          <Text as="span" className="disabled" size="sm" spacing="mb-0">
            {props.event.new?.title}
          </Text>
        </>
      )}
    </Text>
  );
}

function GroupArchivedEvent(props: Props) {
  return (
    <Text size="sm" spacing="mb-0">
      Le groupe 
      <Text as="span" className="disabled" size="sm" spacing="mb-0">
        {props.event.old?.title}
      </Text>
       dans lequel était ce logement a été archivé
    </Text>
  );
}

function GroupRemovedEvent(props: Props) {
  return (
    <Text size="sm" spacing="mb-0">
      Le groupe 
      <Text as="span" className="disabled" size="sm" spacing="mb-0">
        {props.event.old?.title}
      </Text>
       dans lequel était ce logement a été supprimé
    </Text>
  );
}

export default GroupEventContent;
