import Button from '@codegouvfr/react-dsfr/Button';
import { useRef } from 'react';

import { Container, Text } from '../_dsfr';
import { Housing, HousingUpdate } from '../../models/Housing';
import Aside from '../Aside/Aside';
import HousingEditionForm from './HousingEditionForm';
import styles from './housing-edition.module.scss';
import AppLink from '../_app/AppLink/AppLink';
import Label from '../Label/Label';
import Typography from '@mui/material/Typography';

interface Props {
  housing?: Housing;
  expand: boolean;
  onSubmit: (housing: Housing, housingUpdate: HousingUpdate) => void;
  onClose: () => void;
}

function HousingEditionSideMenu({ housing, expand, onSubmit, onClose }: Props) {
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
                <Typography component="h6" className="fr-mb-0 fr-pt-1w">
                  {housing.rawAddress.join(' - ')}
                </Typography>
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
              <HousingEditionForm
                housing={housing}
                onSubmit={submit}
                ref={statusFormRef}
              />
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
}

export default HousingEditionSideMenu;
