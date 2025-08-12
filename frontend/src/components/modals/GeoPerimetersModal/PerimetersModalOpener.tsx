import Button from '@codegouvfr/react-dsfr/Button';

import type createPerimetersModal from './PerimetersModal';

interface PerimetersModalOpenerProps {
  className?: string;
  modal: ReturnType<typeof createPerimetersModal>;
}

function PerimetersModalOpener(props: PerimetersModalOpenerProps) {
  return (
    <Button
      className={props.className}
      priority="tertiary"
      size="small"
      iconId="fr-icon-france-line"
      onClick={props.modal.open}
    >
      Gérer vos périmètres
    </Button>
  );
}

export default PerimetersModalOpener;
