import Button from '@codegouvfr/react-dsfr/Button';
import Typography from '@mui/material/Typography';
import { useRef } from 'react';

import { Container } from '../_dsfr';
import { HousingUpdate } from '../../models/Housing';
import { displayCount } from '../../utils/stringUtils';
import Aside from '../Aside/Aside';
import HousingEditionForm from './HousingEditionForm';
import LabelNext from '../Label/LabelNext';
import Box from '@mui/material/Box';

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
        <Container
          as="header"
          className="position-relative"
          fluid
        >
          <Box component="header">
            <LabelNext>Mise à jour groupée</LabelNext>
            <Typography variant="h6">
              {displayCount(housingCount, 'logement sélectionné')}
            </Typography>
                      <Button
            priority="tertiary no outline"
            iconId="ri-close-line"
            iconPosition="left"
            onClick={onClose}
            style={{ position: 'absolute', top: '2rem', right: '1.5rem' }}
          >
            Fermer
          </Button>
          </Box>



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
