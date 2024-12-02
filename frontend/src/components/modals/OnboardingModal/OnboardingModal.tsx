import { createModal } from '@codegouvfr/react-dsfr/Modal';

const modal = createModal({
  id: 'onboarding-modal',
  isOpenedByDefault: true
});

function OnboardingModal() {
  return (
    <modal.Component size="large" title="Bienvenue sur Zéro Logement Vacant !">
      TODO
      <iframe
        width="100%"
        height="480"
        src="https://app.livestorm.co/p/1b26afab-3332-4b6d-a9e4-3f38b4cc6c43/form"
      />
    </modal.Component>
  );
}

export default OnboardingModal;
