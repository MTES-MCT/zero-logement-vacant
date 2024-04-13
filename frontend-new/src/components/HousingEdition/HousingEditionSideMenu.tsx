import { useRef } from 'react';
import { Container, Text, Title } from '../_dsfr';
import { Housing, HousingUpdate } from '../../models/Housing';
import Aside from '../Aside/Aside';
import HousingEditionForm from './HousingEditionForm';
import EventsHistory from '../EventsHistory/EventsHistory';
import { Event } from '../../models/Event';
import { Note } from '../../models/Note';
import styles from './housing-edition.module.scss';
import Button from '@codegouvfr/react-dsfr/Button';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import AppLink from '../_app/AppLink/AppLink';
import Label from '../Label/Label';

interface Props {
  housing?: Housing;
  housingEvents?: Event[];
  housingNotes?: Note[];
  expand: boolean;
  onSubmit: (housing: Housing, housingUpdate: HousingUpdate) => void;
  onClose: () => void;
}

const HousingEditionSideMenu = ({
  housing,
  housingEvents,
  housingNotes,
  expand,
  onSubmit,
  onClose,
}: Props) => {
  const statusFormRef = useRef<{ submit: () => void }>();

  const submit = (housingUpdate: HousingUpdate) => {
    if (housing) {
      onSubmit(housing, housingUpdate);
    }
  };

  return (
    <div className={styles.sideMenu}>
      <Aside
        expand={expand}
        onClose={onClose}
        title={
          housing && (
            <>
              <Container as="header" className="d-flex" fluid spacing="pb-0">
                <Title as="h6" className="fr-mb-0 fr-pt-1w">
                  {housing.rawAddress.join(' - ')}
                </Title>
                <Button
                  priority="tertiary no outline"
                  iconId="ri-close-line"
                  iconPosition="right"
                  onClick={onClose}
                >
                  Fermer
                </Button>
              </Container>
              <Container as="section" spacing="p-0 mb-3w">
                <Text size="sm" spacing="m-0">
                  <Label as="span">Invariant fiscal : </Label>
                  {housing.invariant}
                </Text>
                <AppLink
                  to={'/logements/' + housing.id}
                  isSimple
                  target="_blank"
                >
                  Voir la fiche logement
                </AppLink>
              </Container>
            </>
          )
        }
        content={
          housing && (
            <Container as="section" spacing="p-0">
              <Tabs
                className="no-border first-tab-grey"
                tabs={[
                  {
                    label: '+ Nouvelle mise à jour / note',
                    content: (
                      <HousingEditionForm
                        housing={housing}
                        onSubmit={submit}
                        ref={statusFormRef}
                      />
                    ),
                  },
                  {
                    label: 'Historique de suivi',
                    content: (
                      <EventsHistory
                        events={housingEvents ?? []}
                        notes={housingNotes ?? []}
                      />
                    ),
                  },
                ]}
              ></Tabs>
            </Container>
          )
        }
        footer={
          <>
            <Button
              priority="secondary"
              className="fr-mr-2w"
              onClick={() => onClose()}
            >
              Annuler
            </Button>
            {
              <Button onClick={() => statusFormRef.current?.submit()}>
                Enregistrer
              </Button>
            }
          </>
        }
      />
    </div>
  );
};

export default HousingEditionSideMenu;
