import React, { useRef, useState } from 'react';
import { SearchableSelect } from '@dataesr/react-dsfr';
import establishmentService from '../../services/establishment.service';

interface Props {
    onChange(establishmentId: string): void
}

const EstablishmentSearchableSelect = ({ onChange }: Props) => {

    const [establishmentOptions, setEstablishmentOptions] = useState<{value: string, label: string}[]>([]);
    const quickSearchAbortRef = useRef<() => void | null>();

    const quickSearch = (query: string) => {

        quickSearchAbortRef.current?.();

        const quickSearchService = establishmentService.quickSearchService();
        quickSearchAbortRef.current = quickSearchService.abort;

        if (query.length) {
            return quickSearchService.fetch(query)
                .then(_ => setEstablishmentOptions(_.map(
                    establishment => ({
                        value: establishment.id,
                        label: establishment.name
                    }))
                ))
                .catch(err => console.log('error', err))
        } else {
            return Promise.resolve([])
        }
    }

    return (
        <SearchableSelect
            options={establishmentOptions}
            label="Etablissement : "
            onChange={onChange}
            onTextChange={(q: string) => quickSearch(q)}
        />
    );
};

export default EstablishmentSearchableSelect;

