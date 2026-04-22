export type VehicleProfile = {
  make: string;
  model: string;
  year: string;
  engine: string;
};

export type Part = {
  id: string;
  partNumber: string;
  name: string;
  category: string;
  compatibleVehicles: string[];
};

export type Supplier = {
  id: string;
  name: string;
  location: string;
  distanceKm: number;
  fuelCostPerKm: number;
  inventory: {
    partNumber: string;
    priceZar: number;
    stock: number;
  }[];
};

export type RankedResult = {
  supplier: Supplier;
  itemPrice: number;
  fuelCostEstimate: number;
  totalCost: number;
  stock: number;
  score: number;
};
