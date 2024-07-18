import { useEffect, useState } from 'react';
import { SearchableSelect } from '../_dsfr';
import { useAvailableEstablishments } from '../../hooks/useAvailableEstablishments';
import _ from 'lodash';
import { SelectOption } from '../../models/SelectOption';
import { establishmentService } from '../../services/establishment.service';

interface Props {
  onChange(establishmentId?: string): void;
  initialEstablishmentOption?: { value: string; label: string };
}

const EstablishmentSearchableSelect = ({
  onChange,
  initialEstablishmentOption,
}: Props) => {
  const { availableEstablishmentOptions, } = useAvailableEstablishments();
  const [establishmentOptions, setEstablishmentOptions] = useState<
    SelectOption[]
  >([]);
  const [selected, setSelected] = useState(initialEstablishmentOption?.value);

  const addOption = (o1: SelectOption[], o2?: SelectOption) =>
    _.unionWith(o1, o2 ? [o2] : [], (s1, s2) => s1.value === s2.value);

  useEffect(() => {
    setEstablishmentOptions(
      addOption(availableEstablishmentOptions, initialEstablishmentOption)
    );
  }, [availableEstablishmentOptions, initialEstablishmentOption]);

  const quickSearch = (query: string) => {
    if (query.length) {
      establishmentService
        .quickSearch(query)
        .then((_) =>
          setEstablishmentOptions(
            _.map((establishment) => ({
              value: establishment.id,
              label: establishment.name,
            }))
          )
        )
        .catch((err) => console.log('error', err));
    } else {
      setSelected(initialEstablishmentOption?.value);
      setEstablishmentOptions(
        addOption(availableEstablishmentOptions, initialEstablishmentOption)
      );
    }
  };

  return (
    <SearchableSelect
      className="fr-my-0 fr-mr-2w"
      selected={selected}
      options={establishmentOptions}
      onChange={(value: any) => {
        setSelected(value);
        if (value.length) {
          onChange(value);
        }
      }}
      placeholder="Rechercher un établissement"
      required={true}
      onTextChange={(q: string) => quickSearch(q)}
    />
  );
};

export default EstablishmentSearchableSelect;
