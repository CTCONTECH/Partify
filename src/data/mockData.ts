import { Part, Supplier } from "@/types";

export const catalogue: Part[] = [
  {
    id: "p1",
    partNumber: "90915-YZZE1",
    name: "Oil Filter",
    category: "Service",
    compatibleVehicles: [
      "Toyota Corolla 1.6",
      "Toyota Hilux 2.4",
      "Toyota Fortuner 2.8"
    ]
  },
  {
    id: "p2",
    partNumber: "DCP17074",
    name: "Front Brake Pads",
    category: "Brakes",
    compatibleVehicles: ["VW Polo Vivo 1.4", "VW Polo 1.0 TSI"]
  },
  {
    id: "p3",
    partNumber: "GDB2163",
    name: "Rear Brake Pads",
    category: "Brakes",
    compatibleVehicles: ["Ford Ranger 2.0 BiTurbo", "Ford Everest 2.0"]
  },
  {
    id: "p4",
    partNumber: "6PK2080",
    name: "Fan Belt",
    category: "Engine",
    compatibleVehicles: ["Hyundai i20 1.4", "Kia Rio 1.4"]
  }
];

export const suppliers: Supplier[] = [
  {
    id: "s1",
    name: "Atlantic Auto Spares",
    location: "Bellville",
    distanceKm: 7,
    fuelCostPerKm: 1.6,
    inventory: [
      { partNumber: "90915-YZZE1", priceZar: 139, stock: 12 },
      { partNumber: "DCP17074", priceZar: 419, stock: 4 },
      { partNumber: "GDB2163", priceZar: 539, stock: 0 },
      { partNumber: "6PK2080", priceZar: 289, stock: 5 }
    ]
  },
  {
    id: "s2",
    name: "Cape Car Parts Hub",
    location: "Montague Gardens",
    distanceKm: 16,
    fuelCostPerKm: 1.6,
    inventory: [
      { partNumber: "90915-YZZE1", priceZar: 119, stock: 21 },
      { partNumber: "DCP17074", priceZar: 449, stock: 9 },
      { partNumber: "GDB2163", priceZar: 515, stock: 8 },
      { partNumber: "6PK2080", priceZar: 264, stock: 7 }
    ]
  },
  {
    id: "s3",
    name: "MobiFix Spares",
    location: "Cape Town CBD",
    distanceKm: 11,
    fuelCostPerKm: 1.6,
    inventory: [
      { partNumber: "90915-YZZE1", priceZar: 129, stock: 0 },
      { partNumber: "DCP17074", priceZar: 399, stock: 3 },
      { partNumber: "GDB2163", priceZar: 549, stock: 7 },
      { partNumber: "6PK2080", priceZar: 272, stock: 6 }
    ]
  },
  {
    id: "s4",
    name: "Winelands Motor Supply",
    location: "Brackenfell",
    distanceKm: 24,
    fuelCostPerKm: 1.6,
    inventory: [
      { partNumber: "90915-YZZE1", priceZar: 105, stock: 30 },
      { partNumber: "DCP17074", priceZar: 378, stock: 2 },
      { partNumber: "GDB2163", priceZar: 499, stock: 4 },
      { partNumber: "6PK2080", priceZar: 251, stock: 11 }
    ]
  }
];
