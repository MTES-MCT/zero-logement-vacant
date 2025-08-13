import { SearchBar } from '@codegouvfr/react-dsfr/SearchBar';
import { useState } from 'react';

export interface AppSearchBarProps {
  label?: string;
  className?: string;
  disabled?: boolean;
  initialQuery?: string;
  placeholder?: string;
  size?: 'md' | 'xl';
  onSearch(text: string): void;
  onKeySearch?(text: string): Promise<void>;
}

function AppSearchBar(props: AppSearchBarProps) {
  const [search, setSearch] = useState<string>(props.initialQuery ?? '');
  const [, setRef] = useState<HTMLInputElement | null>(null);

  return (
    <SearchBar
      allowEmptySearch={false}
      big={props.size === 'xl'}
      className={props.className}
      clearInputOnSearch
      label={props.label ?? 'Rechercher'}
      onButtonClick={props.onSearch}
      renderInput={({ className, id, placeholder: inputPlaceholder, type }) => (
        <input
          ref={setRef}
          className={className}
          disabled={props.disabled}
          id={id}
          placeholder={props.placeholder ?? inputPlaceholder}
          type={type}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            props.onKeySearch?.(event.target.value);
          }}
        />
      )}
    />
  );
}

export default AppSearchBar;
