import { Radio, RadioGroup } from "@dataesr/react-dsfr";

interface Props {
  message?: string
  messageType?: string
  onChange(value: string): void
}

const CampaignIntent = (props: Props) => {
  const values = [
    { label: 'Dans les 2 prochains mois', value: '0-2' },
    { label: 'Dans 2 à 4 mois', value: '2-4' },
    { label: 'Dans plus de 4 mois', value: '4+' }
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
