function getSectionFromHash(hash) {
  if (!hash || hash === "#") return "#top";
  return hash;
}

function setActiveNavigation(targetHash) {
  const normalized = getSectionFromHash(targetHash);
  document.querySelectorAll(".side-nav a, .mobile-nav a").forEach((link) => {
    const linkHash = getSectionFromHash(link.getAttribute("href"));
    link.classList.toggle("active", linkHash === normalized);
  });
}

function scrollToSection(hash) {
  const normalized = getSectionFromHash(hash);
  const section = document.querySelector(normalized);
  if (!section) return;

  section.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", normalized);
  setActiveNavigation(normalized);
}

function bindSipdaNavigation() {
  document.querySelectorAll(".side-nav a, .mobile-nav a").forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      event.preventDefault();
      scrollToSection(href);
    });
  });

  const observedSections = ["#top", "#mapa", "#ia", "#risc", "#docs"]
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible && visible.target.id) {
        setActiveNavigation(`#${visible.target.id}`);
      }
    },
    {
      root: null,
      threshold: [0.28, 0.45, 0.65],
      rootMargin: "-12% 0px -55% 0px"
    }
  );

  observedSections.forEach((section) => observer.observe(section));

  if (location.hash) {
    setTimeout(() => scrollToSection(location.hash), 250);
  } else {
    setActiveNavigation("#top");
  }
}

document.addEventListener("DOMContentLoaded", bindSipdaNavigation);
