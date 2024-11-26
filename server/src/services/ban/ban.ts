export interface AddressQuery {
  label: string;
}

export interface Address {
  id: string;
  label: string;
  houseNumber: string;
  street: string;
  postalCode: string;
  city: string;
  latitude: number;
  longitude: number;
  score: number;
}

export interface Point {
  longitude: number;
  latitude: number;
}

export interface BAN {
  searchMany<Q extends AddressQuery>(
    addresses: ReadonlyArray<Q>
  ): Promise<ReadonlyArray<Address & Q>>;
  reverseMany<P extends Point>(
    points: ReadonlyArray<P>
  ): Promise<ReadonlyArray<Address & P>>;
}
