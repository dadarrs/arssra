import { TrackerDefinition } from '../core';
import { tvchaosukTracker } from './tvchaosuk';
import { tvvaultTracker } from './tvvault';

export const TRACKERS: TrackerDefinition[] = [tvchaosukTracker, tvvaultTracker];
