import type { GeoProvider } from "./types";
import { createMapplsProvider } from "./mappls";
import { createOlaProvider } from "./ola";
import { createOsmProvider } from "./osm";

/**
 * Provider factory, in order of preference:
 *   1. MapmyIndia (Mappls) — best India address quality. Needs client id + secret.
 *   2. Ola Maps — decent India data. Needs API key.
 *   3. OSM Nominatim — free fallback, weaker India data.
 */
export function getGeoProvider(): GeoProvider {
  const mapplsId = process.env.MAPPLS_CLIENT_ID?.trim();
  const mapplsSecret = process.env.MAPPLS_CLIENT_SECRET?.trim();
  if (mapplsId && mapplsSecret) return createMapplsProvider(mapplsId, mapplsSecret);

  const olaKey = process.env.OLA_MAPS_API_KEY?.trim();
  if (olaKey) return createOlaProvider(olaKey);

  return createOsmProvider("BhagvanRealtors/1.0 (local-realtors-demo)");
}

export type { GeoProvider, ReverseGeocodeResult } from "./types";
