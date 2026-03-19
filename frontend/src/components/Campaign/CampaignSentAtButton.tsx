import { Button, type ButtonProps } from '@codegouvfr/react-dsfr/Button';
import type { SetOptional, SetRequired } from 'type-fest';

type CampaignSentAtButtonProps = SetRequired<
  SetOptional<ButtonProps.Common & ButtonProps.AsButton, 'priority' | 'size'>,
  'onClick'
>;

function CampaignSentAtButton(props: Readonly<CampaignSentAtButtonProps>) {
  return (
    <Button priority="secondary" size="small" {...props}>
      Indiquer la date d’envoi
    </Button>
  );
}

export default CampaignSentAtButton;
