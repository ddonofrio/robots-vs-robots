import type { Frame, WorldState } from '../core/types';

export const PROTOCOL_VERSION = 1;
export const MAX_PLAYERS = 20;

export type ServerMessage =
  | { type: 'snapshot'; state: WorldState }
  | { type: 'frame'; frame: Frame };

