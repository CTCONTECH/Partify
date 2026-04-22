import { Part, RankedResult, Supplier, VehicleProfile } from "@/types";

const vehicleKey = (profile: VehicleProfile) =>
  `${profile.make} ${profile.model} ${profile.engine}`.trim();

export const filterPartsForVehicle = (parts: Part[], profile: VehicleProfile) => {
  const key = vehicleKey(profile).toLowerCase();
  return parts.filter((part) =>
    part.compatibleVehicles.some((item) => item.toLowerCase().includes(key))
  );
};

export const rankSuppliersForPart = (
  supplierList: Supplier[],
  partNumber: string
): RankedResult[] => {
  const matches: RankedResult[] = [];

  supplierList.forEach((supplier) => {
    const found = supplier.inventory.find((entry) => entry.partNumber === partNumber);
    if (!found || found.stock <= 0) {
      return;
    }

    const fuelCostEstimate = Number((supplier.distanceKm * supplier.fuelCostPerKm).toFixed(2));
    const totalCost = Number((found.priceZar + fuelCostEstimate).toFixed(2));

    const score =
      found.priceZar * 0.5 +
      supplier.distanceKm * 7 +
      fuelCostEstimate * 0.3 +
      Math.max(0, 10 - found.stock) * 4;

    matches.push({
      supplier,
      itemPrice: found.priceZar,
      fuelCostEstimate,
      totalCost,
      stock: found.stock,
      score
    });
  });

  return matches.sort((a, b) => a.score - b.score);
};

export const getBestPrice = (ranked: RankedResult[]) =>
  ranked.reduce((best, current) =>
    current.itemPrice < best.itemPrice ? current : best
  );

export const getNearestSupplier = (ranked: RankedResult[]) =>
  ranked.reduce((nearest, current) =>
    current.supplier.distanceKm < nearest.supplier.distanceKm ? current : nearest
  );
