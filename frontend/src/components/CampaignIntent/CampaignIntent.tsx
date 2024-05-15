import { MessageType } from '../../hooks/useForm';
import RadioButtons from '@codegouvfr/react-dsfr/RadioButtons';

interface Props {
  defaultValue?: string;
  disabled?: boolean;
  message?: string;
  messageType?: MessageType;
  onChange(value: string): void;
}

const CampaignIntent = (props: Props) => {
  const values = [
    { label: <strong>Dans les 2 prochains mois</strong>, value: '0-2' },
    {
      label: (
        <span>
          Dans <strong>2 à 4 mois</strong>
        </span>
      ),
      value: '2-4'
    },
    {
      label: (
        <span>
          Dans <strong>plus de 4 mois</strong>
        </span>
      ),
      value: '4+'
    }
  ];

  const disabled = props.disabled ?? false;

  function defaultChecked(value: string): boolean {
    return value === props.defaultValue;
  }

  return (
    <RadioButtons
      disabled={disabled}
      options={values.map((item) => ({
        label: item.label,
        nativeInputProps: {
          value: item.value,
          defaultChecked: defaultChecked(item.value),
          onChange: () => props.onChange(item.value)
        }
      }))}
      state={props.messageType}
      stateRelatedMessage={props.message}
    />
  );
};

export default CampaignIntent;
