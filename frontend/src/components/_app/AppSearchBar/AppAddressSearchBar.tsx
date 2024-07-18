import addressService, {
  AddressSearchResult
} from '../../../services/address.service';
import AppSearchBar, { SearchResult } from './AppSearchBar';
import AppLink from '../AppLink/AppLink';

interface Props {
  help?: boolean;
  label?: string;
  initialQuery?: string;
  initialSearch?: boolean;
  onSelectAddress(addressSearchResult?: AddressSearchResult): void;
}

function AppAddressSearchBar(props: Props) {
  const help = props.help ?? true;

  async function quickSearch(query: string): Promise<SearchResult[] | void> {
    if (query.length > 2) {
      try {
        const _ = await addressService.quickSearch(query);
        return _.map((address) => ({
          title: address.label,
          onclick: () => {
            props.onSelectAddress({
              ...address,
              score: 1,
            });
          },
        }));
      } catch (err) {
        console.log('error', err);
      }
    }
  }

  return (
    <>
      <label className="fr-label fr-mb-1w">
        Adresse (source : 
        <AppLink
          to="https://adresse.data.gouv.fr/base-adresse-nationale#4.4/46.9/1.7"
          target="_blank"
        >
          Base Adresse Nationale
        </AppLink>
        )
        {help && (
          <AppLink
            to="https://zerologementvacant.crisp.help/fr/article/comment-choisir-entre-ladresse-ban-et-ladresse-lovac-1ivvuep/?bust=1705403706774"
            size="sm"
            className="float-right"
            target="_blank"
          >
            Je ne trouve pas l’adresse dans la liste
          </AppLink>
        )}
      </label>
      <AppSearchBar
        onSearch={quickSearch}
        onKeySearch={quickSearch}
        placeholder="Rechercher une adresse"
        initialQuery={props.initialQuery}
        initialSearch={props.initialSearch}
      ></AppSearchBar>
    </>
  );
}

export default AppAddressSearchBar;
