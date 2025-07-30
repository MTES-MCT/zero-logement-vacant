import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { Selection } from '~/hooks/useSelection';
import { HousingUpdate } from '../../models/Housing';
import { displayCount } from '../../utils/stringUtils';
import AsideNext from '../Aside/AsideNext';
import LabelNext from '../Label/LabelNext';

interface Props {
  housingCount: number;
  selected: Selection;
  open: boolean;
  onSubmit: (housingUpdate: HousingUpdate) => void;
  onClose: () => void;
}

const WIDTH = '700px';

function HousingListEditionSideMenu(props: Props) {
  return (
    <AsideNext
      drawerProps={{
        sx: (theme) => ({
          zIndex: theme.zIndex.appBar + 1,
          '& .MuiDrawer-paper': {
            px: '1.5rem',
            py: '2rem',
            width: WIDTH
          }
        })
      }}
      header={
        <Stack component="header">
          <LabelNext>Mise à jour groupée</LabelNext>
          <Typography variant="h6">
            {displayCount(props.housingCount, 'logement sélectionné')}
          </Typography>
        </Stack>
      }
      main={'Main'}
      footer={'Footer'}
      open={props.open}
      onClose={props.onClose}
      onSave={() => {}}
    />
  );

  // return (
  //   <Aside
  //     expand={open}
  //     onClose={onClose}
  //     title={
  //       <Container as="header" className="position-relative" fluid>
  //         <Box component="header">
  //           <LabelNext>Mise à jour groupée</LabelNext>
  //           <Typography variant="h6">
  //             {displayCount(housingCount, 'logement sélectionné')}
  //           </Typography>
  //           <Button
  //             priority="tertiary no outline"
  //             iconId="ri-close-line"
  //             iconPosition="left"
  //             onClick={onClose}
  //             style={{ position: 'absolute', top: '2rem', right: '1.5rem' }}
  //           >
  //             Fermer
  //           </Button>
  //         </Box>
  //       </Container>
  //     }
  //     content={
  //       <>
  //         {open && (
  //           <HousingEditionForm
  //             housingCount={housingCount}
  //             onSubmit={onSubmit}
  //             ref={statusFormRef}
  //           />
  //         )}
  //       </>
  //     }
  //     footer={
  //       <>
  //         <Button
  //           priority="secondary"
  //           className="fr-mr-2w"
  //           onClick={() => onClose()}
  //         >
  //           Annuler
  //         </Button>
  //         <Button onClick={() => statusFormRef.current?.submit()}>
  //           Enregistrer
  //         </Button>
  //       </>
  //     }
  //   />
  // );
}

export default HousingListEditionSideMenu;
