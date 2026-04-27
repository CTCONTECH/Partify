import { mockVehicles } from '@/data/mockData';

export interface VehicleOption {
  make: string;
  model: string;
  year: number;
  engine: string;
}

export function getVehicleMakes(): string[] {
  return Array.from(new Set(mockVehicles.map(vehicle => vehicle.make))).sort();
}

export function getVehicleModels(make: string): string[] {
  return Array.from(
    new Set(mockVehicles.filter(vehicle => vehicle.make === make).map(vehicle => vehicle.model))
  ).sort();
}

export function getVehicleYears(make: string, model: string): number[] {
  return Array.from(
    new Set(
      mockVehicles
        .filter(vehicle => vehicle.make === make && vehicle.model === model)
        .map(vehicle => vehicle.year)
    )
  ).sort((a, b) => b - a);
}

export function getVehicleEngines(make: string, model: string, year: number): string[] {
  return Array.from(
    new Set(
      mockVehicles
        .filter(vehicle => vehicle.make === make && vehicle.model === model && vehicle.year === year)
        .map(vehicle => vehicle.engine)
    )
  ).sort();
}

export function formatVehicle(vehicle: VehicleOption): string {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.engine}`;
}

export function scorePartCompatibility(partCompatibility: string, vehicle?: VehicleOption | null): number {
  if (!vehicle) return 0;

  const haystack = partCompatibility.toLowerCase();
  let score = 0;

  if (haystack.includes(vehicle.make.toLowerCase())) score += 3;
  if (haystack.includes(vehicle.model.toLowerCase())) score += 3;
  if (haystack.includes(String(vehicle.year))) score += 2;
  if (haystack.includes(vehicle.engine.toLowerCase())) score += 1;

  return score;
}
