import type { GeoProvider, ReverseGeocodeResult } from "./types";

/**
 * MapmyIndia (Mappls) reverse geocode — India-native, best-in-class Indian address data.
 *
 * Auth: OAuth2 client-credentials flow.
 *   1. POST to https://outpost.mappls.com/api/security/oauth/token with grant_type=client_credentials
 *      and your client id + secret → returns an access_token (~1 hour TTL).
 *   2. Call the Reverse Geocoding API with `Authorization: Bearer <access_token>`.
 *
 * Endpoint: GET https://apis.mappls.com/advancedmaps/v1/{access_token}/rev_geocode?lat=..&lng=..
 *   (some accounts use https://apis.mapmyindia.com/... — both work, apis.mappls.com is newer.)
 *
 * Docs: https://about.mappls.com/api/advanced-maps/doc/reverse-geocoding-api.php
 *
 * Free tier: 500-1000 API hits/day depending on plan — plenty for a single dealer.
 * Signup: https://about.mappls.com/api/ — pick Individual, no credit card needed for the free tier.
 */

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.token; // still valid (with 30s buffer)
  }
  const url = "https://outpost.mappls.com/api/security/oauth/token";
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Mappls token failed: ${res.status} ${await res.text()}`);
  const j = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    token: j.access_token,
    expiresAt: now + j.expires_in * 1000,
  };
  return j.access_token;
}

export function createMapplsProvider(clientId: string, clientSecret: string): GeoProvider {
  return {
    async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
      const token = await getAccessToken(clientId, clientSecret);
      const url = `https://apis.mappls.com/advancedmaps/v1/${token}/rev_geocode?lat=${lat}&lng=${lng}`;
      const res = await fetch(url, {
        headers: { "accept": "application/json", "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Mappls reverse geocode failed: ${res.status} ${await res.text()}`);
      const body = await res.json() as MapplsResponse;
      const r = body.results?.[0];
      if (!r) return empty();

      return {
        formatted_address: r.formatted_address ?? null,
        door_no:  r.houseNumber ?? null,
        building: r.houseName ?? null,
        street:   r.street ?? null,
        area:     r.subSubLocality ?? r.subLocality ?? null,
        locality: r.locality ?? r.subLocality ?? null,
        city:     r.city ?? r.district ?? null,
        district: r.district ?? null,
        state:    r.state ?? null,
        pincode:  r.pincode ?? null,
        country:  "India",
        provider: "mappls",
      };
    },
  };
}

function empty(): ReverseGeocodeResult {
  return {
    formatted_address: null, door_no: null, building: null, street: null,
    area: null, locality: null, city: null, district: null, state: null,
    pincode: null, country: null, provider: "mappls",
  };
}

type MapplsResponse = {
  results?: Array<{
    formatted_address?: string;
    houseNumber?: string;
    houseName?: string;
    street?: string;
    subSubLocality?: string;
    subLocality?: string;
    locality?: string;
    village?: string;
    district?: string;
    subDistrict?: string;
    city?: string;
    state?: string;
    pincode?: string;
  }>;
};
