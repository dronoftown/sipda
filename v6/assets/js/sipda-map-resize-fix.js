function forceSipdaMapResize() {
  const mapContainer = document.getElementById("sipdaMap");
  if (!mapContainer) return;

  window.dispatchEvent(new Event("resize"));

  const canvas = mapContainer.querySelector("canvas");
  if (canvas && mapContainer.clientWidth > 0 && mapContainer.clientHeight > 0) {
    canvas.style.width = "100%";
    canvas.style.height = "100%";
  }
}

function scheduleSipdaMapResize() {
  const delays = [0, 80, 180, 320, 520, 780, 1100, 1500];
  delays.forEach((delay) => window.setTimeout(forceSipdaMapResize, delay));
}

function bindSipdaMapResizeAfterLogin() {
  const observer = new MutationObserver(() => {
    if (document.body.classList.contains("is-authenticated")) {
      scheduleSipdaMapResize();
    }
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"]
  });

  window.addEventListener("resize", () => window.setTimeout(forceSipdaMapResize, 80));
  window.addEventListener("orientationchange", scheduleSipdaMapResize);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleSipdaMapResize();
  });

  if (document.body.classList.contains("is-authenticated")) {
    scheduleSipdaMapResize();
  }
}

document.addEventListener("DOMContentLoaded", bindSipdaMapResizeAfterLogin);