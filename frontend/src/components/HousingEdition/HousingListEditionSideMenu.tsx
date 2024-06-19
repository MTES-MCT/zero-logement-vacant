import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Typography from '@mui/material/Typography';
import { useRef } from 'react';

import { Container } from '../_dsfr';
import { HousingUpdate } from '../../models/Housing';
import { displayCount } from '../../utils/stringUtils';
import Aside from '../Aside/Aside';
import HousingEditionForm from './HousingEditionForm';

interface Props {
  housingCount: number;
  open: boolean;
  onSubmit: (housingUpdate: HousingUpdate) => void;
  onClose: () => void;
}

const HousingListEditionSideMenu = ({
  housingCount,
  open,
  onSubmit,
  onClose
}: Props) => {
  const statusFormRef = useRef<{
    submit: () => void;
  }>();

  return (
    <Aside
      expand={open}
      onClose={onClose}
      title={
        <Container as="header" className="d-flex" fluid>
          <Typography component="h6" className="d-inline-block" mb={0} pt={1}>
            {displayCount(housingCount, 'logement sélectionné')}
          </Typography>
          <div className="align-right">
            <Button
              priority="tertiary no outline"
              iconId="ri-close-line"
              iconPosition="right"
              onClick={onClose}
            >
              Fermer
            </Button>
            <Alert
              description="Mise à jour groupée"
              small
              severity="warning"
            ></Alert>
          </div>
        </Container>
      }
      content={
        <>
          {open && (
            <HousingEditionForm
              housingCount={housingCount}
              onSubmit={onSubmit}
              ref={statusFormRef}
            />
          )}
        </>
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
          <Button onClick={() => statusFormRef.current?.submit()}>
            Enregistrer
          </Button>
        </>
      }
    />
  );
};

export default HousingListEditionSideMenu;
