import { getVehicleRepository } from '../adapters/factory';
import { getAuthContext } from '../auth/client';
import { VehicleOption } from '../vehicle-catalog';

const MOCK_USER_ID = 'mock-user';

function getPrimaryFlag(vehicle: any): boolean {
  return Boolean(vehicle.isPrimary ?? vehicle.is_primary);
}

function getCreatedAt(vehicle: any): string {
  return vehicle.createdAt ?? vehicle.created_at ?? '';
}

export class VehicleService {
  private vehicleRepo = getVehicleRepository();

  async getCurrentUserId(): Promise<string> {
    const auth = await getAuthContext();
    return auth.userId ?? MOCK_USER_ID;
  }

  async getPrimaryVehicle(): Promise<(VehicleOption & { id?: string }) | null> {
    const userId = await this.getCurrentUserId();
    const vehicles = await this.vehicleRepo.getUserVehicles(userId);

    if (vehicles.length === 0) return null;

    const primary = vehicles.find(getPrimaryFlag) || [...vehicles].sort((a, b) =>
      getCreatedAt(b).localeCompare(getCreatedAt(a))
    )[0];

    return {
      id: primary.id,
      make: primary.make,
      model: primary.model,
      year: Number(primary.year),
      engine: primary.engine,
    };
  }

  async savePrimaryVehicle(vehicle: VehicleOption): Promise<void> {
    const userId = await this.getCurrentUserId();
    const saved = await this.vehicleRepo.addVehicle(userId, vehicle);

    if (saved?.id) {
      await this.vehicleRepo.setPrimaryVehicle(saved.id);
    }
  }
}

export const vehicleService = new VehicleService();
