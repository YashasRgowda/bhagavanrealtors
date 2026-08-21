import type { GeoProvider, ReverseGeocodeResult } from "./types";

/**
 * OpenStreetMap Nominatim — no API key, but strict rate limits (1 req/sec).
 * Used as fallback when OLA_MAPS_API_KEY is not set.
 * Docs: https://nominatim.org/release-docs/latest/api/Reverse/
 */
export function createOsmProvider(userAgent: string): GeoProvider {
  return {
    async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          "accept": "application/json",
          "user-agent": userAgent, // Nominatim requires a UA identifying the app
        },
      });
      if (!res.ok) throw new Error(`OSM reverse geocode failed: ${res.status}`);
      const body = await res.json() as OsmResponse;
      const a = body.address ?? {};
      return {
        formatted_address: body.display_name ?? null,
        door_no:  a.house_number ?? null,
        building: null,
        street:   a.road ?? null,
        area:     a.suburb ?? a.neighbourhood ?? a.residential ?? null,
        locality: a.suburb ?? a.town ?? a.village ?? null,
        city:     a.city ?? a.town ?? a.village ?? null,
        district: a.state_district ?? null,
        state:    a.state ?? null,
        pincode:  a.postcode ?? null,
        country:  a.country ?? null,
        provider: "osm",
      };
    },
  };
}

type OsmResponse = {
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    residential?: string;
    town?: string;
    village?: string;
    city?: string;
    state_district?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};
