/** Provider-agnostic reverse-geocode result the app understands. */
export type ReverseGeocodeResult = {
  formatted_address: string | null;
  door_no: string | null;
  building: string | null;    // e.g. "Prestige Sunrise"
  street: string | null;
  area: string | null;        // sub-locality, e.g. "Sector 7"
  locality: string | null;    // e.g. "HSR Layout"
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
  provider: "mappls" | "ola" | "osm" | "none";
};

export interface GeoProvider {
  reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult>;
}
