import axios from 'axios';
import { parse as fromCSV } from 'csv-parse/sync';
import { stringify as toCSV } from 'csv-stringify/sync';

import { Address, AddressQuery, BAN, Point } from '~/services/ban/ban';

class BanAPI implements BAN {
  readonly http = axios.create({
    baseURL: 'https://api-adresse.data.gouv.fr'
  });

  async searchMany<Q extends AddressQuery>(
    queries: ReadonlyArray<Q>
  ): Promise<ReadonlyArray<Address & Q>> {
    if (!queries.length) {
      throw new Error('Must contain at least one query');
    }

    const [query] = queries;
    const columns = listColumns(query);
    const csv = toCSV(queries as Q[], {
      header: true,
      columns
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const form = new FormData();
    form.append('data', blob, 'search.csv');

    // Add columns
    columns.forEach((column) => {
      form.append('columns', column);
    });

    // Tells the API that geoCode is an INSEE code
    form.append('citycode', 'geoCode');
    form.append('result_columns', 'result_id');
    form.append('result_columns', 'result_label');
    form.append('result_columns', 'result_type');
    form.append('result_columns', 'result_housenumber');
    form.append('result_columns', 'result_street');
    form.append('result_columns', 'result_postcode');
    form.append('result_columns', 'result_city');
    form.append('result_columns', 'latitude');
    form.append('result_columns', 'longitude');
    form.append('result_columns', 'result_score');

    const { data } = await this.http.post<string>('/search/csv', form);
    const records: ReadonlyArray<BanAddress & Q> = fromCSV(data, {
      columns: true
    });
    return records.filter((record) => !!record.result_id).map<Address & Q>(map);
  }

  async reverseMany<P extends Point>(
    points: ReadonlyArray<P>
  ): Promise<ReadonlyArray<Address & P>> {
    if (!points.length) {
      throw new Error('Must contain at least one point');
    }

    const columns = listColumns(points[0]);
    const csv = toCSV(points as P[], {
      header: true,
      columns
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const form = new FormData();
    form.append('data', blob, 'reverse.csv');

    // Add columns
    columns.forEach((column) => {
      form.append('columns', column);
    });

    // Tells the API that geoCode is an INSEE code

    form.append('citycode', 'geoCode');
    form.append('result_columns', 'result_id');
    form.append('result_columns', 'result_label');
    form.append('result_columns', 'result_type');
    form.append('result_columns', 'result_housenumber');
    form.append('result_columns', 'result_street');
    form.append('result_columns', 'result_postcode');
    form.append('result_columns', 'result_city');
    form.append('result_columns', 'latitude');
    form.append('result_columns', 'longitude');
    form.append('result_columns', 'result_score');

    const { data } = await this.http.post<string>('/reverse/csv', form);
    const records: ReadonlyArray<BanAddress & P> = fromCSV(data, {
      columns: true
    });
    return records.map<Address & P>(map);
  }
}

interface BanAddress {
  result_id: string;
  result_label: string;
  result_housenumber: string;
  result_street: string;
  result_postcode: string;
  result_city: string;
  latitude: string;
  longitude: string;
  result_score: string;
}

function listColumns<A extends object>(a: A): ReadonlyArray<string> {
  return Object.keys(a);
}

function map<A>(address: BanAddress & A): Address & A {
  const {
    result_id,
    result_label,
    result_housenumber,
    result_street,
    result_postcode,
    result_city,
    result_score,
    latitude,
    longitude,
    ...rest
  } = address;
  return {
    ...(rest as unknown as A),
    id: result_id,
    label: result_label,
    houseNumber: result_housenumber,
    street: result_street,
    postalCode: result_postcode,
    city: result_city,
    latitude: Number(latitude),
    longitude: Number(longitude),
    score: Number(result_score)
  };
}

export function createBanAPI(): BAN {
  return new BanAPI();
}
