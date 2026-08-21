import type { GeoProvider, ReverseGeocodeResult } from "./types";

/**
 * Ola Maps reverse geocode.
 * Docs: https://maps.olakrutrim.com/docs/geocode-reverse
 * Endpoint: GET https://api.olamaps.io/places/v1/reverse-geocode?latlng={lat},{lng}&api_key=...
 */
export function createOlaProvider(apiKey: string): GeoProvider {
  return {
    async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
      const url = `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, { headers: { "accept": "application/json" } });
      if (!res.ok) {
        throw new Error(`Ola reverse geocode failed: ${res.status} ${await res.text()}`);
      }
      const body = await res.json() as OlaResponse;
      const first = body.results?.[0];
      if (!first) return empty("ola");

      // Ola returns Google-style `address_components` — map by `types`.
      const byType: Record<string, string> = {};
      for (const c of first.address_components ?? []) {
        for (const t of c.types) byType[t] = c.long_name;
      }
      return {
        formatted_address: first.formatted_address ?? null,
        door_no:  byType.street_number ?? null,
        building: byType.premise ?? byType.subpremise ?? null,
        street:   byType.route ?? null,
        area:     byType.sublocality_level_2 ?? byType.sublocality_level_1 ?? byType.sublocality ?? null,
        locality: byType.locality ?? byType.administrative_area_level_3 ?? null,
        city:     byType.administrative_area_level_2 ?? byType.locality ?? null,
        district: byType.administrative_area_level_2 ?? null,
        state:    byType.administrative_area_level_1 ?? null,
        pincode:  byType.postal_code ?? null,
        country:  byType.country ?? null,
        provider: "ola",
      };
    },
  };
}

function empty(provider: ReverseGeocodeResult["provider"]): ReverseGeocodeResult {
  return {
    formatted_address: null, door_no: null, building: null, street: null,
    area: null, locality: null, city: null, district: null, state: null,
    pincode: null, country: null, provider,
  };
}

type OlaResponse = {
  results?: Array<{
    formatted_address?: string;
    address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
    geometry?: { location: { lat: number; lng: number } };
  }>;
};
