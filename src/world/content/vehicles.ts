export interface VehicleDefinition {
  id: string;
  displayName: string;
  seats: number;
  cargoSlots: number;
  maxSpeed: number;
}

/**
 * Vehicle behavior is deliberately data-driven. New cars should register here;
 * physics and networking must stay in the engine/server layers.
 */
export const vehicles: readonly VehicleDefinition[] = [
  { id: 'scout', displayName: 'Scout', seats: 1, cargoSlots: 6, maxSpeed: 12 },
  { id: 'hauler', displayName: 'Hauler', seats: 2, cargoSlots: 24, maxSpeed: 7 },
] as const;

