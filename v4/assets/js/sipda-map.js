const SIPDA_MAP_CONFIG = {
  center: [3.0636, 41.8170],
  zoom: 13.75,
  pitch: 62,
  bearing: -16
};

function showMapTokenNotice(message) {
  const notice = document.getElementById("mapTokenNotice");
  if (!notice) return;
  notice.hidden = false;
  if (message) {
    const span = notice.querySelector("span");
    if (span) span.textContent = message;
  }
}

function buildPopupHTML(properties) {
  const riskLabel = {
    high: "Alto",
    medium: "Medio",
    low: "Bajo"
  }[properties.risk] || "Sin clasificar";

  return `
    <div class="sipda-popup">
      <strong>${properties.zone || "Zona operativa"}</strong>
      <span>${properties.type || "Incidencia"} · Riesgo ${riskLabel}</span>
      <em>Intensidad ${properties.intensity || 0}/10</em>
    </div>
  `;
}

function getFirstSymbolLayerId(map) {
  const layers = map.getStyle().layers || [];
  const symbolLayer = layers.find((layer) => layer.type === "symbol" && layer.layout && layer.layout["text-field"]);
  return symbolLayer ? symbolLayer.id : undefined;
}

function addTerrain3D(map) {
  if (!map.getSource("mapbox-dem")) {
    map.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14
    });
  }

  map.setTerrain({ source: "mapbox-dem", exaggeration: 1.25 });

  if (!map.getLayer("sipda-3d-buildings")) {
    map.addLayer(
      {
        id: "sipda-3d-buildings",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: 14,
        paint: {
          "fill-extrusion-color": "rgba(255,255,255,0.70)",
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "min_height"],
          "fill-extrusion-opacity": 0.52
        }
      },
      getFirstSymbolLayerId(map)
    );
  }
}

function initSipdaMap() {
  if (!window.mapboxgl) {
    showMapTokenNotice("No se ha podido cargar Mapbox GL JS.");
    return;
  }

  const token = window.SIPDA_MAPBOX_TOKEN;

  if (!token || token.includes("REPLACE_WITH")) {
    showMapTokenNotice("Configura el secret MAPBOX_PUBLIC_TOKEN en GitHub Actions.");
    return;
  }

  mapboxgl.accessToken = token;

  const map = new mapboxgl.Map({
    container: "sipdaMap",
    style: "mapbox://styles/mapbox/satellite-streets-v12",
    center: SIPDA_MAP_CONFIG.center,
    zoom: SIPDA_MAP_CONFIG.zoom,
    pitch: SIPDA_MAP_CONFIG.pitch,
    bearing: SIPDA_MAP_CONFIG.bearing,
    antialias: true
  });

  map.addControl(
    new mapboxgl.NavigationControl({ visualizePitch: true }),
    "bottom-right"
  );

  map.on("load", () => {
    addTerrain3D(map);

    map.addSource("sipda-incidents", {
      type: "geojson",
      data: "./data/incidents.geojson"
    });

    map.addLayer({
      id: "sipda-heatmap",
      type: "heatmap",
      source: "sipda-incidents",
      maxzoom: 17,
      paint: {
        "heatmap-weight": [
          "interpolate",
          ["linear"],
          ["get", "intensity"],
          0, 0,
          10, 1.35
        ],
        "heatmap-intensity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10, 1.15,
          14, 2.35,
          16, 3.1
        ],
        "heatmap-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10, 38,
          14, 74,
          16, 96
        ],
        "heatmap-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10, 0.72,
          14, 0.82,
          16, 0.66
        ],
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0, "rgba(0,84,166,0)",
          0.12, "rgba(0,84,166,0.20)",
          0.32, "rgba(22,163,74,0.32)",
          0.55, "rgba(245,158,11,0.45)",
          0.78, "rgba(239,68,68,0.58)",
          1, "rgba(239,68,68,0.72)"
        ]
      }
    });

    map.addLayer({
      id: "sipda-points",
      type: "circle",
      source: "sipda-incidents",
      minzoom: 12.6,
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "intensity"],
          1, 5,
          10, 13
        ],
        "circle-color": [
          "match",
          ["get", "risk"],
          "high", "#ef4444",
          "medium", "#f59e0b",
          "low", "#16a34a",
          "#0054A6"
        ],
        "circle-stroke-color": "rgba(255,255,255,0.42)",
        "circle-stroke-width": 1,
        "circle-opacity": 0.18,
        "circle-blur": 0.6
      }
    });

    map.on("click", "sipda-points", (event) => {
      const feature = event.features && event.features[0];
      if (!feature) return;

      new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: true,
        offset: 16
      })
        .setLngLat(feature.geometry.coordinates)
        .setHTML(buildPopupHTML(feature.properties || {}))
        .addTo(map);
    });

    map.on("mouseenter", "sipda-points", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "sipda-points", () => {
      map.getCanvas().style.cursor = "";
    });
  });

  map.on("style.load", () => {
    try {
      addTerrain3D(map);
    } catch (error) {
      console.warn("SIPDA 3D terrain warning", error);
    }
  });

  map.on("error", (event) => {
    console.warn("SIPDA Mapbox error", event && event.error ? event.error : event);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) window.lucide.createIcons();
  initSipdaMap();
});
