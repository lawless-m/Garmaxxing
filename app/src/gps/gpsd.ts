import type { GpsFix, GpsSource, GpsStatus } from './types';
import { normaliseDeg } from './geo';

export interface GpsdSourceOptions {
  /**
   * WebSocket URL of a local gpsd→WebSocket bridge. Browsers can't open raw
   * TCP to gpsd (port 2947), so a tiny bridge on the Orin re-publishes gpsd's
   * JSON over ws://. See data/README and 04-deployment.md.
   */
  url?: string;
  /** Reconnect backoff in ms (default 2000). */
  reconnectMs?: number;
}

/**
 * Real position source for the van: consumes gpsd TPV (time-position-velocity)
 * reports forwarded over a local WebSocket. Implements the same GpsSource
 * contract as the simulator.
 *
 * gpsd TPV fields used: lat, lon, track (course °), speed (m/s), mode (>=2 = fix).
 */
export class GpsdSource implements GpsSource {
  private readonly url: string;
  private readonly reconnectMs: number;

  private readonly fixHandlers = new Set<(fix: GpsFix) => void>();
  private readonly statusHandlers = new Set<(status: GpsStatus) => void>();

  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(options: GpsdSourceOptions = {}) {
    this.url = options.url ?? 'ws://127.0.0.1:2948';
    this.reconnectMs = options.reconnectMs ?? 2000;
  }

  onFix(handler: (fix: GpsFix) => void): () => void {
    this.fixHandlers.add(handler);
    return () => this.fixHandlers.delete(handler);
  }

  onStatus(handler: (status: GpsStatus) => void): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws !== null) {
      this.ws.close();
      this.ws = null;
    }
    this.emitStatus({ state: 'lost' });
  }

  private connect(): void {
    this.emitStatus({ state: 'acquiring' });
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onmessage = (event) => {
      const fix = this.parseTpv(event.data);
      if (fix !== null) {
        this.emitStatus({ state: 'fix' });
        for (const handler of this.fixHandlers) handler(fix);
      }
    };
    ws.onclose = () => {
      this.ws = null;
      if (!this.stopped) this.scheduleReconnect();
    };
    ws.onerror = () => {
      // onclose follows and handles the reconnect.
    };
  }

  private scheduleReconnect(): void {
    this.emitStatus({ state: 'lost' });
    this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectMs);
  }

  /** Parse a gpsd JSON line into a GpsFix, or null if it isn't a usable TPV. */
  parseTpv(raw: unknown): GpsFix | null {
    let msg: {
      class?: string;
      mode?: number;
      lat?: number;
      lon?: number;
      track?: number;
      speed?: number;
      time?: string;
    };
    try {
      msg = typeof raw === 'string' ? JSON.parse(raw) : (raw as typeof msg);
    } catch {
      return null;
    }
    if (msg.class !== 'TPV') return null;
    if (msg.mode === undefined || msg.mode < 2) return null; // no 2D/3D fix
    if (typeof msg.lat !== 'number' || typeof msg.lon !== 'number') return null;

    return {
      lat: msg.lat,
      lng: msg.lon,
      headingDeg: typeof msg.track === 'number' ? normaliseDeg(msg.track) : null,
      speedMps: typeof msg.speed === 'number' ? msg.speed : null,
      timestamp: msg.time ? Date.parse(msg.time) : Date.now(),
    };
  }

  private emitStatus(status: GpsStatus): void {
    for (const handler of this.statusHandlers) handler(status);
  }
}
