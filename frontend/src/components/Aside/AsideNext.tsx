import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import ButtonsGroup from '@codegouvfr/react-dsfr/ButtonsGroup';
import Drawer, { DrawerProps } from '@mui/material/Drawer';
import Grid from '@mui/material/Unstable_Grid2';
import { ReactNode } from 'react';

interface AsideProps {
  drawerProps?: Omit<DrawerProps, 'open' | 'onClose'>;
  header?: ReactNode;
  main?: ReactNode;
  footer?: ReactNode;
  open: boolean;
  onClose(): void;
  onSave(): void;
}

function Aside(props: AsideProps) {
  return (
    <Drawer
      anchor="right"
      open={props.open}
      onClose={props.onClose}
      slotProps={{
        backdrop: {
          invisible: true
        }
      }}
      {...props.drawerProps}
    >
      <Grid container sx={{ flexDirection: 'column' }} xs>
        <Grid container sx={{ justifyContent: 'space-between', mb: 3 }}>
          {props.header && <Grid xs>{props.header}</Grid>}

          <Grid xs="auto">
            <Button
              iconId="fr-icon-close-line"
              priority="tertiary no outline"
              onClick={props.onClose}
            >
              Fermer
            </Button>
          </Grid>
        </Grid>

        <Grid xs>{props.main}</Grid>

        <Grid className={fr.cx('fr-mt-3w', 'fr-mb-1w')}>
          <hr style={{ margin: `0 -${fr.spacing('3w')}` }} />
          {props.footer ?? (
            <ButtonsGroup
              buttons={[
                {
                  priority: 'secondary',
                  children: 'Annuler',
                  onClick: props.onClose
                },
                {
                  priority: 'primary',
                  children: 'Enregistrer',
                  onClick: props.onSave
                }
              ]}
              inlineLayoutWhen="always"
            />
          )}
        </Grid>
      </Grid>
    </Drawer>
  );
}

export default Aside;
