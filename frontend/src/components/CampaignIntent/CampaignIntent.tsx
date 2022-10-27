import { Radio, RadioGroup } from "@dataesr/react-dsfr";

interface Props {
  message?: string
  messageType?: string
  onChange(value: string): void
}

const CampaignIntent = (props: Props) => {
  const values = [
    { label: 'Sous 0 à 2 mois', value: '0-2' },
    { label: 'Sous 2 à 4 mois', value: '2-4' },
    { label: 'Au-delà de 4 mois', value: '4+' }
  ]

  return (
    <RadioGroup
      legend=""
      onChange={props.onChange}
      required
      message={props.message}
      messageType={props.messageType}
    >
      {values.map((item, index) => {
        return <Radio
          key={index}
          label={item.label}
          value={item.value}
          isExtended={true}
        />
      })}
    </RadioGroup>
  )
}

export default CampaignIntent;
