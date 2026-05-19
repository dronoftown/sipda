const SIPDA_MAP_CONFIG = {
  center: [3.067, 41.817],
  zoom: 13.25,
  pitch: 48,
  bearing: -12
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
    style: "mapbox://styles/mapbox/standard",
    center: SIPDA_MAP_CONFIG.center,
    zoom: SIPDA_MAP_CONFIG.zoom,
    pitch: SIPDA_MAP_CONFIG.pitch,
    bearing: SIPDA_MAP_CONFIG.bearing,
    antialias: true,
    config: {
      basemap: {
        theme: "monochrome",
        lightPreset: "day"
      }
    }
  });

  map.addControl(
    new mapboxgl.NavigationControl({ visualizePitch: true }),
    "bottom-right"
  );

  map.on("load", () => {
    map.addSource("sipda-incidents", {
      type: "geojson",
      data: "./data/incidents.geojson"
    });

    map.addLayer({
      id: "sipda-heatmap",
      type: "heatmap",
      source: "sipda-incidents",
      maxzoom: 16,
      paint: {
        "heatmap-weight": [
          "interpolate",
          ["linear"],
          ["get", "intensity"],
          0, 0,
          10, 1
        ],
        "heatmap-intensity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          11, 0.75,
          15, 2.55
        ],
        "heatmap-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          11, 18,
          15, 46
        ],
        "heatmap-opacity": 0.74,
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0, "rgba(0,84,166,0)",
          0.25, "rgba(0,84,166,.34)",
          0.5, "rgba(22,163,74,.44)",
          0.75, "rgba(245,158,11,.62)",
          1, "rgba(239,68,68,.82)"
        ]
      }
    });

    map.addLayer({
      id: "sipda-points",
      type: "circle",
      source: "sipda-incidents",
      minzoom: 13,
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
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-opacity": 0.94
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

  map.on("error", (event) => {
    console.warn("SIPDA Mapbox error", event && event.error ? event.error : event);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) window.lucide.createIcons();
  initSipdaMap();
});
