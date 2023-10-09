import { Col, Container, Icon, Row, Text } from '../_dsfr';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { OwnerProspect } from '../../models/OwnerProspect';
import Aside from '../Aside/Aside';
import ExtendedToggle from '../ExtendedToggle/ExtendedToggle';
import styles from './inbox-sidemenu.module.scss';
import React, { useMemo } from 'react';
import { useClipboard } from '../../hooks/useClipboard';
import Label from '../Label/Label';
import { initials } from '../../utils/stringUtils';
import Button from '@codegouvfr/react-dsfr/Button';
import AppLink from '../_app/AppLink/AppLink';

interface Props {
  expand: boolean;
  onChange?: (ownerProspect: OwnerProspect) => void;
  onClose?: () => void;
  ownerProspect?: OwnerProspect;
}

function InboxSidemenu(props: Props) {
  const clipboard = useClipboard();

  function copyMail(): void {
    if (props.ownerProspect?.email) {
      clipboard.copy(props.ownerProspect?.email);
    }
  }

  function onChange(checked: boolean): void {
    if (props.onChange && props.ownerProspect) {
      props.onChange({
        ...props.ownerProspect,
        callBack: checked,
      });
    }
  }

  const sentAt = useMemo<string | undefined>(() => {
    const createdAt = props.ownerProspect?.createdAt;
    if (createdAt) {
      return format(new Date(createdAt), 'dd MMMM yyyy, k:mm', { locale: fr });
    }
  }, [props.ownerProspect?.createdAt]);

  return (
    <Aside
      expand={props.expand}
      onClose={props.onClose}
      title={`Message entrant de ${props.ownerProspect?.firstName} ${props.ownerProspect?.lastName}`}
      content={
        <Container as="article" fluid>
          {sentAt && (
            <Row justifyContent="center">
              <Text className="subtitle" size="sm">
                {sentAt}
              </Text>
            </Row>
          )}
          <Row>
            {props.ownerProspect?.firstName &&
              props.ownerProspect?.lastName && (
                <div className={styles.initials}>
                  {initials(
                    props.ownerProspect.firstName,
                    props.ownerProspect.lastName
                  )}
                </div>
              )}
            <Col className={styles.message} n="12">
              <div>
                <Label>Nom et prénom</Label>
                <Text className="ellipsis" spacing="mb-1w">
                  {props.ownerProspect?.lastName.toUpperCase()} 
                  {props.ownerProspect?.firstName}
                </Text>
              </div>
              <div>
                <Label>Email</Label>
                <Text spacing="mb-1w">{props.ownerProspect?.email}</Text>
                <Button
                  priority="secondary"
                  className="fr-mb-1w"
                  onClick={copyMail}
                >
                  <Icon
                    name="fr-icon-file-copy-line"
                    iconPosition="left"
                    size="1x"
                  />
                  {clipboard.copied ? 'Copié !' : 'Copier mail'}
                </Button>
              </div>
              <div>
                <Label>Adresse du logement</Label>
                <AppLink
                  className="ellipsis fr-mb-1w"
                  to={`https://www.google.com/maps/place/${props.ownerProspect?.address}`}
                  iconId="fr-icon-map-pin-2-fill"
                  iconPosition="left"
                  isSimple
                  target="_blank"
                  title="Voir sur la carte - nouvelle fenêtre"
                >
                  {props.ownerProspect?.address}
                </AppLink>
              </div>
              <div>
                <Label>Source du message</Label>
                <Text spacing="mb-1w">Formulaire de la page publique</Text>
              </div>
              <div>
                <Label>Message</Label>
                <Text spacing="mb-1w">{props.ownerProspect?.notes}</Text>
              </div>
            </Col>
          </Row>
        </Container>
      }
      footer={
        <section className={styles.callBack}>
          {props.ownerProspect && (
            <ExtendedToggle
              checked={props.ownerProspect.callBack}
              iconId="fr-icon-phone-fill"
              label="À recontacter"
              onChange={onChange}
              toggleColor="#4a9df7"
            />
          )}
        </section>
      }
    />
  );
}

export default InboxSidemenu;
