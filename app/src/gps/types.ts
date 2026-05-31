/**
 * A single position fix, normalised from whatever upstream produced it
 * (gpsd in the van, the simulator on a workstation).
 */
export interface GpsFix {
  /** WGS84 latitude in degrees. */
  lat: number;
  /** WGS84 longitude in degrees. */
  lng: number;
  /** Course over ground in degrees clockwise from true north, or null if unknown. */
  headingDeg: number | null;
  /** Ground speed in metres per second, or null if unknown. */
  speedMps: number | null;
  /** Fix time, epoch milliseconds. */
  timestamp: number;
}

export type GpsState = 'acquiring' | 'fix' | 'lost';

export interface GpsStatus {
  state: GpsState;
}

/**
 * A source of position fixes. gpsd and the simulator both implement this so
 * the rest of the app never knows which one it is talking to.
 */
export interface GpsSource {
  /** Subscribe to fixes. Returns an unsubscribe function. */
  onFix(handler: (fix: GpsFix) => void): () => void;
  /** Subscribe to connection/fix-state changes. Returns an unsubscribe function. */
  onStatus(handler: (status: GpsStatus) => void): () => void;
  /** Begin producing fixes. */
  start(): void;
  /** Stop and release resources. */
  stop(): void;
}
