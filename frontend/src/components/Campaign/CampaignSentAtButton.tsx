import { Button, type ButtonProps } from '@codegouvfr/react-dsfr/Button';
import type { SetOptional, SetRequired } from 'type-fest';

type CampaignSentAtButtonProps = SetRequired<
  SetOptional<ButtonProps.Common & ButtonProps.AsButton, 'priority' | 'size'>,
  'onClick'
> & {
  /**
   * @default 'full'
   */
  variant?: 'icon' | 'full';
};

function CampaignSentAtButton(props: Readonly<CampaignSentAtButtonProps>) {
  const variant = props.variant ?? 'full';

  if (variant === 'icon') {
    return (
      <Button
        priority="secondary"
        size="small"
        iconId="ri-edit-line"
        title="Indiquer la date d’envoi"
        {...props}
        nativeButtonProps={{
          ...props.nativeButtonProps,
          'aria-label': 'Indiquer la date d’envoi'
        }}
      />
    );
  }

  return (
    <Button priority="secondary" size="small" {...props}>
      Indiquer la date d’envoi
    </Button>
  );
}

export default CampaignSentAtButton;
