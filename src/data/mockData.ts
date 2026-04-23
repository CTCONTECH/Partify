export const capeTownSuburbs = [
  'Sea Point', 'Green Point', 'Gardens', 'Observatory', 'Woodstock',
  'Salt River', 'Bellville', 'Parow', 'Goodwood', 'Brackenfell',
  'Kuils River', 'Milnerton', 'Table View', 'Blouberg', 'Century City',
  'Claremont', 'Wynberg', 'Constantia', 'Tokai', 'Muizenberg',
  'Retreat', 'Athlone', 'Mitchells Plain', 'Khayelitsha', 'Strand'
];

export const mockSuppliers = [
  {
    id: 's1',
    name: 'AutoZone Cape Town',
    location: 'Bellville',
    address: '12 Voortrekker Road, Bellville, Cape Town, 7530',
    coordinates: { lat: -33.8989, lon: 18.6289 },
    rating: 4.5,
    totalParts: 850
  },
  {
    id: 's2',
    name: 'Midas Auto Parts',
    location: 'Parow',
    address: '45 Oude Molen Road, Parow, Cape Town, 7500',
    coordinates: { lat: -33.8950, lon: 18.5850 },
    rating: 4.7,
    totalParts: 1200
  },
  {
    id: 's3',
    name: 'Cape Auto Spares',
    location: 'Woodstock',
    address: '78 Victoria Road, Woodstock, Cape Town, 7925',
    coordinates: { lat: -33.9307, lon: 18.4472 },
    rating: 4.2,
    totalParts: 650
  },
  {
    id: 's4',
    name: 'Motor City Parts',
    location: 'Milnerton',
    address: '156 Koeberg Road, Milnerton, Cape Town, 7441',
    coordinates: { lat: -33.8769, lon: 18.5011 },
    rating: 4.6,
    totalParts: 920
  },
  {
    id: 's5',
    name: 'ProAuto Supply',
    location: 'Brackenfell',
    address: '23 Old Paarl Road, Brackenfell, Cape Town, 7560',
    coordinates: { lat: -33.8678, lon: 18.6892 },
    rating: 4.8,
    totalParts: 1500
  }
];

export const mockParts = [
  {
    id: 'p1',
    partNumber: 'BP-4567',
    partName: 'Front Brake Pads',
    category: 'Brakes',
    compatibility: 'Toyota Corolla 2015-2020',
    description: 'High-performance ceramic brake pads'
  },
  {
    id: 'p2',
    partNumber: 'OF-8921',
    partName: 'Oil Filter',
    category: 'Engine',
    compatibility: 'VW Golf 2012-2018',
    description: 'OEM quality oil filter'
  },
  {
    id: 'p3',
    partNumber: 'SP-1234',
    partName: 'Spark Plugs (Set of 4)',
    category: 'Engine',
    compatibility: 'Honda Civic 2016-2021',
    description: 'Iridium spark plugs for better performance'
  },
  {
    id: 'p4',
    partNumber: 'AF-5678',
    partName: 'Air Filter',
    category: 'Engine',
    compatibility: 'Ford Focus 2014-2019',
    description: 'High-flow air filter'
  },
  {
    id: 'p5',
    partNumber: 'WP-9012',
    partName: 'Water Pump',
    category: 'Cooling',
    compatibility: 'BMW 3 Series 2010-2015',
    description: 'Complete water pump assembly'
  }
];

export const mockInventory = [
  {
    partId: 'p1',
    supplierId: 's1',
    price: 450.00,
    stock: 8,
    lastUpdated: '2026-04-20'
  },
  {
    partId: 'p1',
    supplierId: 's2',
    price: 425.00,
    stock: 3,
    lastUpdated: '2026-04-21'
  },
  {
    partId: 'p1',
    supplierId: 's3',
    price: 480.00,
    stock: 12,
    lastUpdated: '2026-04-19'
  },
  {
    partId: 'p1',
    supplierId: 's5',
    price: 440.00,
    stock: 6,
    lastUpdated: '2026-04-22'
  },
  {
    partId: 'p2',
    supplierId: 's1',
    price: 85.00,
    stock: 15,
    lastUpdated: '2026-04-20'
  },
  {
    partId: 'p2',
    supplierId: 's2',
    price: 80.00,
    stock: 22,
    lastUpdated: '2026-04-21'
  },
  {
    partId: 'p2',
    supplierId: 's4',
    price: 90.00,
    stock: 8,
    lastUpdated: '2026-04-18'
  }
];

export const mockVehicles = [
  { make: 'Toyota', model: 'Corolla', year: 2018, engine: '1.6 Petrol' },
  { make: 'VW', model: 'Polo', year: 2019, engine: '1.4 TSI' },
  { make: 'Honda', model: 'Civic', year: 2017, engine: '1.8 VTEC' },
  { make: 'Ford', model: 'Fiesta', year: 2016, engine: '1.0 EcoBoost' },
  { make: 'BMW', model: '320i', year: 2015, engine: '2.0 Turbo' }
];

export function calculateFuelCost(distance: number): number {
  const fuelPricePerKm = 2.5;
  return Math.round(distance * fuelPricePerKm * 2 * 100) / 100;
}

export function getSupplierResults(partId: string, userLocation?: { lat: number; lon: number }) {
  const part = mockParts.find(p => p.id === partId);
  if (!part) return [];

  const inventory = mockInventory.filter(inv => inv.partId === partId);

  const results = inventory.map(inv => {
    const supplier = mockSuppliers.find(s => s.id === inv.supplierId);
    if (!supplier) return null;

    // Calculate actual distance if user location provided
    let distance = 5.0; // Default fallback
    if (userLocation) {
      distance = calculateDistance(userLocation, supplier.coordinates);
    }

    const fuelCost = calculateFuelCost(distance);
    const totalCost = inv.price + fuelCost;

    return {
      id: supplier.id,
      name: supplier.name,
      location: supplier.location,
      address: supplier.address,
      coordinates: supplier.coordinates,
      distance,
      itemPrice: inv.price,
      fuelCost,
      totalCost,
      stockQty: inv.stock,
      partNumber: part.partNumber,
      partName: part.partName
    };
  }).filter(Boolean);

  const minPrice = Math.min(...results.map(r => r!.itemPrice));
  const minDistance = Math.min(...results.map(r => r!.distance));
  const minTotal = Math.min(...results.map(r => r!.totalCost));

  return results.map(result => ({
    ...result!,
    isBestPrice: result!.itemPrice === minPrice,
    isClosest: result!.distance === minDistance,
    isBestTotal: result!.totalCost === minTotal
  }));
}

function calculateDistance(from: { lat: number; lon: number }, to: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
