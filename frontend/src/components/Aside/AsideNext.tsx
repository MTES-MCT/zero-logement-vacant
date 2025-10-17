import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import ButtonsGroup from '@codegouvfr/react-dsfr/ButtonsGroup';
import Drawer, { type DrawerProps } from '@mui/material/Drawer';
import Grid from '@mui/material/Grid';
import { type ReactNode } from 'react';

interface CommonProps {
  drawerProps?: Omit<DrawerProps, 'open' | 'onClose'>;
  header?: ReactNode;
  main?: ReactNode;
  footer?: ReactNode;
  width?: number | `${number}rem`;
  open: boolean;
  onClose(): void;
  onSave?(): void;
}

interface FooterProps {
  footer: ReactNode;
  onSave?: never;
}

interface SaveProps {
  footer?: never;
  onSave(): void;
}

const DEFAULT_WIDTH = '40rem';

export type AsideProps = CommonProps & (FooterProps | SaveProps);

function Aside(props: AsideProps) {
  return (
    <Drawer
      anchor="right"
      open={props.open}
      onClose={props.onClose}
      slotProps={{
        backdrop: {
          invisible: true
        },
        paper: {
          sx: {
            width: props.width ?? DEFAULT_WIDTH
          }
        }
      }}
      {...props.drawerProps}
    >
      <Grid container sx={{ flexDirection: 'column' }} size="grow">
        <Grid container sx={{ justifyContent: 'space-between', mb: 3 }}>
          {props.header && <Grid size="grow">{props.header}</Grid>}

          <Grid size="auto">
            <Button
              iconId="fr-icon-close-line"
              priority="tertiary no outline"
              onClick={props.onClose}
              size="small"
            >
              Fermer
            </Button>
          </Grid>
        </Grid>

        <Grid sx={{ overflowY: 'auto' }} size="grow">
          {props.main}
        </Grid>

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
