import Button from '@codegouvfr/react-dsfr/Button';
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
}

function Aside(props: AsideProps) {
  return (
    <Drawer
      anchor="right"
      open={props.open}
      onClose={props.onClose}
      {...props.drawerProps}
    >
      <Grid container sx={{ flexDirection: 'column' }}>
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

        {props.main}

        <Grid>
          {props.footer ?? <Button priority="secondary">Annuler</Button>}
        </Grid>
      </Grid>
    </Drawer>
  );
}

export default Aside;
