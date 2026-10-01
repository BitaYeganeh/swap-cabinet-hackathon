import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LuCrosshair, LuExternalLink, LuMaximize2, LuMinimize2 } from "react-icons/lu";
import { LayersControl, MapContainer, Marker, Popup, ScaleControl, TileLayer, useMap, useMapEvents } from "react-leaflet";

type Props = {
  lat: number;
  lng: number;
  title: string;
  address: string | null;
};

const ZOOM = 14;

// Leaflet's default marker images don't survive bundling, so draw the pin in SVG.
const pin = L.divIcon({
  className: "",
  html: `<svg viewBox="0 0 32 42" width="32" height="42" style="filter:drop-shadow(0 3px 4px rgb(0 0 0 / .35))">
    <path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 41 16 41s15-14 15-25.2C31 7.6 24.3 1 16 1z" fill="#1f5c46" stroke="#fff" stroke-width="2"/>
    <circle cx="16" cy="15.5" r="5.5" fill="#fff"/>
  </svg>`,
  iconSize: [32, 42],
  iconAnchor: [16, 41],
  popupAnchor: [0, -38],
});

const mapButton =
  "grid size-[34px] place-items-center rounded-lg border-2 border-black/20 bg-white text-ink bg-clip-padding hover:bg-surface-2";

export default function ListingMap({ lat, lng, title, address }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [map, setMap] = useState<L.Map | null>(null);
  // Full screen renders in a portal, which remounts the map; carry the view over.
  // MapContainer only reads center/zoom on mount, so updating this is cheap.
  const [view, setView] = useState<{ center: L.LatLngExpression; zoom: number }>({
    center: [lat, lng],
    zoom: ZOOM,
  });

  // Leaflet measures its container once; tell it when the size changes.
  useEffect(() => {
    map?.invalidateSize();
  }, [map, expanded]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [expanded]);

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const content = (
    <div
      className={
        expanded
          ? "fixed inset-0 z-100 flex flex-col bg-bg p-3 sm:p-6"
          : "relative isolate z-0"
      }
    >
      {expanded && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="truncate font-semibold">{address || title}</p>
          <button type="button" onClick={() => setExpanded(false)} className={mapButton} aria-label="Exit full screen">
            <LuMinimize2 className="size-4" />
          </button>
        </div>
      )}

      <div
        className={`relative isolate overflow-hidden rounded-2xl border border-line ${
          expanded ? "flex-1" : "h-64 sm:h-80"
        }`}
      >
        <MapContainer
          center={view.center}
          zoom={view.zoom}
          scrollWheelZoom={false}
          ref={setMap}
          className="size-full"
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Street">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer
                attribution="Tiles &copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          <ScaleControl position="bottomleft" />
          <WheelZoomOnFocus onMove={(center, zoom) => setView({ center, zoom })} />

          <Marker position={[lat, lng]} icon={pin}>
            <Popup>
              <strong>{title}</strong>
              {address && (
                <>
                  <br />
                  {address}
                </>
              )}
            </Popup>
          </Marker>
        </MapContainer>

        {/* Extra controls under the zoom buttons, top left. */}
        <div className="absolute top-[86px] left-[10px] z-1000 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => map?.flyTo([lat, lng], ZOOM)}
            className={mapButton}
            aria-label="Re-centre map"
            title="Re-centre"
          >
            <LuCrosshair className="size-4" />
          </button>
          {!expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className={mapButton}
              aria-label="Full screen map"
              title="Full screen"
            >
              <LuMaximize2 className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-ink-3">
        <span>Click the map to zoom with the scroll wheel</span>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-accent no-underline hover:underline"
        >
          Get directions <LuExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );

  return expanded ? createPortal(content, document.body) : content;
}

// Scroll-wheel zoom stays off so the page scrolls past the map, until the user
// clicks into it; it switches off again when the pointer leaves.
function WheelZoomOnFocus({ onMove }: { onMove: (center: L.LatLng, zoom: number) => void }) {
  const map = useMap();
  useMapEvents({
    click: () => map.scrollWheelZoom.enable(),
    mouseout: () => map.scrollWheelZoom.disable(),
    moveend: () => onMove(map.getCenter(), map.getZoom()),
  });
  return null;
}
