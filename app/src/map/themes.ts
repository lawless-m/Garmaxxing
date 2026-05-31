import type { StyleSpecification } from 'maplibre-gl';
import dayStyle from '../../style/day.json';
import nightStyle from '../../style/night.json';
import demoDay from '../../style/demo-day.json';
import demoNight from '../../style/demo-night.json';

export type Theme = 'day' | 'night';

/**
 * Two style sets:
 *  - the real offline vector styles over gb.pmtiles (production on the Orin);
 *  - lightweight raster demo styles for a workstation with no PMTiles built
 *    yet (sandbox/dev), so the moving map is visible end to end.
 *
 * Selection is by build-time env: set VITE_USE_DEMO_RASTER=1 for the demo.
 */
const useDemo = import.meta.env.VITE_USE_DEMO_RASTER === '1';

const styles: Record<Theme, StyleSpecification> = useDemo
  ? {
      day: demoDay as unknown as StyleSpecification,
      night: demoNight as unknown as StyleSpecification,
    }
  : {
      day: dayStyle as unknown as StyleSpecification,
      night: nightStyle as unknown as StyleSpecification,
    };

export function styleFor(theme: Theme): StyleSpecification {
  return styles[theme];
}

/**
 * Pick a theme from the local clock. Simple dusk/dawn cut at 19:00/07:00;
 * 03-nav-app.md allows a manual override on the keyboard too.
 */
export function themeForHour(hour: number): Theme {
  return hour >= 7 && hour < 19 ? 'day' : 'night';
}
