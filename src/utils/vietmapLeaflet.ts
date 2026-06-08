const VIETMAP_TILE_KEY = import.meta.env.VITE_VIETMAP_TILE_KEY;

/** Raster tile VietMap cho Leaflet */
export const VIETMAP_RASTER_TILE_URL = VIETMAP_TILE_KEY
  ? `https://maps.vietmap.vn/maps/tiles/tm/{z}/{x}/{y}.png?apikey=${VIETMAP_TILE_KEY}`
  : null;

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const createVietMapTileLayer = (
  L: any,
  tileUrl: string,
  options?: { minZoom?: number; maxZoom?: number; attribution?: string }
) => {
  const normalizedUrl = tileUrl.includes('@2x') ? tileUrl.replace('@2x', '') : tileUrl;

  return L.tileLayer(normalizedUrl, {
    minZoom: options?.minZoom ?? 0,
    maxZoom: options?.maxZoom ?? 20,
    attribution: options?.attribution ?? '&copy; VietMap',
  });
};

/** Nền bản đồ: VietMap nếu có key, không thì fallback OSM */
export const createBaseTileLayer = async (L: any) => {
  if (!VIETMAP_TILE_KEY || !VIETMAP_RASTER_TILE_URL) {
    console.warn('[Map] Missing VITE_VIETMAP_TILE_KEY, fallback to OpenStreetMap tile.');

    return L.tileLayer(OSM_TILE_URL, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    });
  }

  return createVietMapTileLayer(L, VIETMAP_RASTER_TILE_URL, {
    minZoom: 0,
    maxZoom: 20,
    attribution: '&copy; VietMap',
  });
};

export const loadLeafletCss = () => {
  if (document.querySelector('link[href*="leaflet.css"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  link.crossOrigin = '';
  document.head.appendChild(link);
};
