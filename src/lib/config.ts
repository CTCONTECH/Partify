// Application Configuration
// Switch between mock and live data here

export const config = {
  // Set to 'mock' for development with mock data
  // Set to 'live' to use Supabase backend
  dataSource: (process.env.NEXT_PUBLIC_DATA_SOURCE || 'mock') as 'mock' | 'live',

  // Supabase configuration (only needed for 'live' mode)
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // Application settings
  coupon: {
    expiryHours: 24,
    defaultDiscountPercent: 5,
  },

  supplier: {
    defaultCommissionRate: 10,
  },

  geolocation: {
    maxDistanceKm: 50,
    fuelCostPerKm: 2.5,
  },
};

export function isLiveMode(): boolean {
  return config.dataSource === 'live' && !!config.supabase.url;
}

export function isMockMode(): boolean {
  return config.dataSource === 'mock' || !config.supabase.url;
}
