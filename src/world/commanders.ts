/** A player is a non-physical commander, never a world entity or avatar. */
export interface Commander {
  id: string;
  name: string;
  /** Robots currently owned or otherwise assigned to this commander. */
  robotIds: string[];
}

/** Ownership must be checked server-side before accepting a robot order. */
export function canCommandRobot(commander: Commander, robotId: string) {
  return commander.robotIds.includes(robotId);
}

