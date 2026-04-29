export interface GeocodedAddress {
  lat: number;
  lon: number;
  label: string;
}

function buildAddressQuery(address: string, suburb: string) {
  return [address, suburb, 'Cape Town', 'South Africa']
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
}

async function geocodeWithMapbox(query: string, token: string): Promise<GeocodedAddress | null> {
  const params = new URLSearchParams({
    access_token: token,
    country: 'za',
    limit: '1',
    types: 'address,place,locality,neighborhood',
  });

  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error('Address lookup failed. Please try again.');
  }

  const payload = await response.json();
  const feature = payload?.features?.[0];
  const center = feature?.center;

  if (!Array.isArray(center) || center.length < 2) return null;

  return {
    lon: Number(center[0]),
    lat: Number(center[1]),
    label: feature.place_name || query,
  };
}

async function geocodeWithOpenStreetMap(query: string): Promise<GeocodedAddress | null> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    countrycodes: 'za',
    limit: '1',
    addressdetails: '1',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Address lookup failed. Please try again.');
  }

  const payload = await response.json();
  const result = Array.isArray(payload) ? payload[0] : null;

  if (!result?.lat || !result?.lon) return null;

  return {
    lat: Number(result.lat),
    lon: Number(result.lon),
    label: result.display_name || query,
  };
}

export async function geocodeBusinessAddress(address: string, suburb: string): Promise<GeocodedAddress> {
  const query = buildAddressQuery(address, suburb);

  if (!address.trim() || !suburb.trim()) {
    throw new Error('Enter a street address and suburb before saving.');
  }

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const result = mapboxToken
    ? await geocodeWithMapbox(query, mapboxToken)
    : await geocodeWithOpenStreetMap(query);

  if (!result || !Number.isFinite(result.lat) || !Number.isFinite(result.lon)) {
    throw new Error('We could not verify this address. Please check the street address and suburb.');
  }

  return result;
}
