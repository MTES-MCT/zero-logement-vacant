import { Radio, RadioGroup } from '@dataesr/react-dsfr';

interface Props {
  defaultValue?: string;
  disabled?: boolean;
  message?: string;
  messageType?: 'error' | 'valid' | '';
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
      value: '2-4',
    },
    {
      label: (
        <span>
          Dans <strong>plus de 4 mois</strong>
        </span>
      ),
      value: '4+',
    },
  ];

  const disabled = props.disabled ?? false;

  function defaultChecked(value: string): boolean {
    return value === props.defaultValue;
  }

  return (
    <RadioGroup
      legend=""
      disabled={disabled}
      onChange={props.onChange}
      required
      message={props.message}
      messageType={props.messageType}
    >
      {values.map((item, index) => {
        return (
          <Radio
            key={index}
            label={item.label as unknown as string}
            value={item.value}
            isExtended={true}
            defaultChecked={defaultChecked(item.value)}
          />
        );
      })}
    </RadioGroup>
  );
};

export default CampaignIntent;
