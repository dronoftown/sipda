const SIPDA_MAP_CONFIG = {
  center: [3.0608, 41.8162],
  zoom: 13.55,
  pitch: 58,
  bearing: -14,
  municipalBbox: [2.9700, 41.7600, 3.1250, 41.8750]
};

const geocodeCache = new Map();

function showMapTokenNotice(message) {
  const notice = document.getElementById("mapTokenNotice");
  if (!notice) return;
  notice.hidden = false;
  const span = notice.querySelector("span");
  if (span) span.textContent = message;
}

function buildPopupHTML(properties) {
  const riskLabel = { high: "Alt", medium: "Mitjà", low: "Baix" }[properties.risk] || "Info";
  return `
    <div class="sipda-popup">
      <strong>${properties.title || properties.zone || "Zona operativa"}</strong>
      <span>${properties.displayAddress || properties.zone || "Zona"} · Risc ${riskLabel}</span>
      <em>${properties.summary || "Servei agregat SIPDA"}</em>
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
  map.setTerrain({ source: "mapbox-dem", exaggeration: 1.12 });

  if (!map.getLayer("sipda-3d-buildings")) {
    map.addLayer({
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
    }, getFirstSymbolLayerId(map));
  }
}

function setLayerVisibility(map, mode) {
  const heatVisibility = mode === "points" ? "none" : "visible";
  const pointVisibility = mode === "heat" ? "none" : "visible";
  if (map.getLayer("sipda-heatmap")) map.setLayoutProperty("sipda-heatmap", "visibility", heatVisibility);
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

function isInsideMunicipalBbox(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return false;
  const [lng, lat] = coordinates;
  const [minLng, minLat, maxLng, maxLat] = SIPDA_MAP_CONFIG.municipalBbox;
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

function normalizeMunicipalAddress(address) {
  const raw = String(address || "").trim();
  if (!raw) return "";
  const hasMunicipality = /platja d['’]?aro|castell d['’]?aro|s['’]?agar[oó]|baix empord[aà]/i.test(raw);
  if (hasMunicipality) return raw;
  return `${raw}, Castell d'Aro Platja d'Aro i S'Agaró, Baix Empordà, Girona, Catalunya, Spain`;
}

function selectBestMunicipalFeature(features) {
  if (!Array.isArray(features)) return null;
  return features.find((feature) => isInsideMunicipalBbox(feature.center)) || null;
}

async function geocodeAddress(address, token) {
  if (!address || !token) return null;
  const normalizedAddress = normalizeMunicipalAddress(address);
  if (geocodeCache.has(normalizedAddress)) return geocodeCache.get(normalizedAddress);
  const bbox = SIPDA_MAP_CONFIG.municipalBbox.join(",");
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(normalizedAddress)}.json?access_token=${encodeURIComponent(token)}&limit=5&language=ca,es&country=es&proximity=3.0608,41.8162&bbox=${bbox}`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();
    const feature = selectBestMunicipalFeature(data && data.features ? data.features : []);
    const center = feature ? feature.center : null;
    if (!center) console.warn("SIPDA geocoding outside municipality ignored", normalizedAddress, data && data.features ? data.features.map((f) => f.center) : []);
    geocodeCache.set(normalizedAddress, center);
    return center;
  } catch (error) {
    console.warn("SIPDA geocoding error", normalizedAddress, error);
    geocodeCache.set(normalizedAddress, null);
    return null;
  }
}

async function loadOperationalGeoJSON(token, sourceData) {
  const data = sourceData || window.SIPDA_OPERATIONAL_DATA || await fetch(`../v5/data/novetats-2026-05-18.json?v=${Date.now()}`, { cache: "no-store" }).then((r) => r.json());
  const features = [];

  for (const item of data.hotspots || []) {
    const geocoded = await geocodeAddress(item.geocodeAddress, token);
    const coordinates = isInsideMunicipalBbox(geocoded) ? geocoded : isInsideMunicipalBbox(item.coordinates) ? item.coordinates : null;
    if (!coordinates) continue;
    features.push({
      type: "Feature",
      properties: {
        id: item.id,
        serviceId: item.serviceId,
        title: item.title,
        zone: item.zone,
        displayAddress: item.displayAddress || item.zone,
        risk: item.risk,
        levelLabel: item.levelLabel,
        intensity: item.intensity,
        category: item.category,
        summary: item.summary
      },
      geometry: { type: "Point", coordinates }
    });
  }

  return { type: "FeatureCollection", features };
}

function fitMapToFeatures(map, geojson) {
  if (!geojson.features.length) return;
  const bounds = new mapboxgl.LngLatBounds();
  geojson.features.forEach((feature) => bounds.extend(feature.geometry.coordinates));
  map.fitBounds(bounds, { padding: 72, maxZoom: 15.2, duration: 1000 });
}

async function refreshMapData(map, token, sourceData) {
  const geojson = await loadOperationalGeoJSON(token, sourceData);
  if (map.getSource("sipda-incidents")) {
    map.getSource("sipda-incidents").setData(geojson);
    fitMapToFeatures(map, geojson);
  }
}

function initSipdaMap() {
  if (!window.mapboxgl) {
    showMapTokenNotice("No s'ha pogut carregar Mapbox GL JS.");
    return;
  }
  const token = window.SIPDA_MAPBOX_TOKEN;
  if (!token || token.includes("REPLACE_WITH")) {
    showMapTokenNotice("Cal configurar MAPBOX_PUBLIC_TOKEN.");
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
    const operationalData = await loadOperationalGeoJSON(token);
    map.addSource("sipda-incidents", { type: "geojson", data: operationalData });

    map.addLayer({
      id: "sipda-heatmap",
      type: "heatmap",
      source: "sipda-incidents",
      maxzoom: 18,
      paint: {
        "heatmap-weight": ["interpolate", ["linear"], ["get", "intensity"], 0, 0, 10, 1.5],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 1.1, 14, 2.4, 16, 3.1],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 34, 14, 70, 16, 100],
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.64, 14, 0.82, 16, 0.70],
        "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", 0.15, "rgba(37,99,235,0.20)", 0.35, "rgba(22,163,74,0.34)", 0.58, "rgba(245,158,11,0.50)", 0.80, "rgba(239,68,68,0.66)", 1, "rgba(239,68,68,0.82)"]
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
      layout: { "text-field": ["get", "levelLabel"], "text-size": 11, "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"], "text-offset": [0, 1.45], "text-anchor": "top", "text-allow-overlap": true, "text-ignore-placement": true },
      paint: { "text-color": "#ffffff", "text-halo-color": "rgba(0,0,0,0.95)", "text-halo-width": 1.6 }
    });

    map.on("click", "sipda-risk-points", (event) => {
      const feature = event.features && event.features[0];
      if (!feature) return;
      new mapboxgl.Popup({ closeButton: true, closeOnClick: true, offset: 16 }).setLngLat(feature.geometry.coordinates).setHTML(buildPopupHTML(feature.properties || {})).addTo(map);
    });
    map.on("mouseenter", "sipda-risk-points", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "sipda-risk-points", () => { map.getCanvas().style.cursor = ""; });

    fitMapToFeatures(map, operationalData);
    bindLayerControls(map);

    window.addEventListener("sipda:data-updated", (event) => refreshMapData(map, token, event.detail));
  });

  map.on("style.load", () => { try { addTerrain3D(map); } catch (error) { console.warn("SIPDA terrain warning", error); } });
  map.on("error", (event) => console.warn("SIPDA map error", event && event.error ? event.error : event));
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) window.lucide.createIcons();
  initSipdaMap();
});