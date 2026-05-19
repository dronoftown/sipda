const SIPDA_MAP_CONFIG = {
  center: [3.0608, 41.8162],
  zoom: 13.55,
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
      <strong>${properties.title || properties.zone || "Zona operativa"}</strong>
      <span>${properties.zone || "Zona"} · Riesgo ${riskLabel}</span>
      <em>${properties.summary || "Servicio agregado SIPDA"}</em>
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

  map.setTerrain({ source: "mapbox-dem", exaggeration: 1.18 });

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
          "fill-extrusion-color": "rgba(255,255,255,0.72)",
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "min_height"],
          "fill-extrusion-opacity": 0.48
        }
      },
      getFirstSymbolLayerId(map)
    );
  }
}

function setLayerVisibility(map, mode) {
  const heatVisibility = mode === "points" ? "none" : "visible";
  const pointVisibility = mode === "heat" ? "none" : "visible";

  ["sipda-heatmap"].forEach((id) => {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", heatVisibility);
  });
  ["sipda-risk-points", "sipda-risk-labels"].forEach((id) => {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", pointVisibility);
  });
}

function bindLayerControls(map) {
  document.querySelectorAll("[data-layer-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-layer-mode]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      setLayerVisibility(map, button.dataset.layerMode);
    });
  });
}

async function loadOperationalGeoJSON() {
  const response = await fetch("./data/novetats-2026-05-18.json", { cache: "no-store" });
  const data = await response.json();

  return {
    type: "FeatureCollection",
    features: data.hotspots.map((item) => ({
      type: "Feature",
      properties: {
        id: item.id,
        serviceId: item.serviceId,
        title: item.title,
        zone: item.zone,
        risk: item.risk,
        levelLabel: item.levelLabel,
        intensity: item.intensity,
        category: item.category,
        summary: item.summary
      },
      geometry: {
        type: "Point",
        coordinates: item.coordinates
      }
    }))
  };
}

function initSipdaMap() {
  if (!window.mapboxgl) {
    showMapTokenNotice("No se ha podido cargar Mapbox GL JS.");
    return;
  }

  const token = window.SIPDA_MAPBOX_TOKEN;
  if (!token || token.includes("REPLACE_WITH")) {
    showMapTokenNotice("Falta MAPBOX_PUBLIC_TOKEN en GitHub Actions.");
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

  map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");

  map.on("load", async () => {
    addTerrain3D(map);
    const operationalData = await loadOperationalGeoJSON();

    map.addSource("sipda-incidents", {
      type: "geojson",
      data: operationalData
    });

    map.addLayer({
      id: "sipda-heatmap",
      type: "heatmap",
      source: "sipda-incidents",
      maxzoom: 18,
      paint: {
        "heatmap-weight": ["interpolate", ["linear"], ["get", "intensity"], 0, 0, 10, 1.45],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 1.05, 14, 2.35, 16, 3.05],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 34, 14, 68, 16, 96],
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.62, 14, 0.78, 16, 0.68],
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0, "rgba(0,0,0,0)",
          0.12, "rgba(37,99,235,0.20)",
          0.32, "rgba(22,163,74,0.32)",
          0.55, "rgba(245,158,11,0.48)",
          0.78, "rgba(239,68,68,0.62)",
          1, "rgba(239,68,68,0.78)"
        ]
      }
    });

    map.addLayer({
      id: "sipda-risk-points",
      type: "circle",
      source: "sipda-incidents",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["get", "intensity"], 1, 6, 10, 12],
        "circle-color": ["match", ["get", "risk"], "high", "#ef4444", "medium", "#f59e0b", "low", "#16a34a", "#111111"],
        "circle-stroke-color": "rgba(255,255,255,0.94)",
        "circle-stroke-width": 2,
        "circle-opacity": 0.94
      }
    });

    map.addLayer({
      id: "sipda-risk-labels",
      type: "symbol",
      source: "sipda-incidents",
      layout: {
        "text-field": ["get", "levelLabel"],
        "text-size": 11,
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        "text-offset": [0, 1.45],
        "text-anchor": "top",
        "text-allow-overlap": true,
        "text-ignore-placement": true
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "rgba(0,0,0,0.95)",
        "text-halo-width": 1.6
      }
    });

    map.on("click", "sipda-risk-points", (event) => {
      const feature = event.features && event.features[0];
      if (!feature) return;

      new mapboxgl.Popup({ closeButton: true, closeOnClick: true, offset: 16 })
        .setLngLat(feature.geometry.coordinates)
        .setHTML(buildPopupHTML(feature.properties || {}))
        .addTo(map);
    });

    map.on("mouseenter", "sipda-risk-points", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "sipda-risk-points", () => { map.getCanvas().style.cursor = ""; });

    bindLayerControls(map);
  });

  map.on("style.load", () => {
    try { addTerrain3D(map); } catch (error) { console.warn("SIPDA 3D terrain warning", error); }
  });

  map.on("error", (event) => {
    console.warn("SIPDA Mapbox error", event && event.error ? event.error : event);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) window.lucide.createIcons();
  initSipdaMap();
});
