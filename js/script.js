// ==========================================================
// 1. STATO GLOBALE E CONFIGURAZIONI
// ==========================================================
const MODEL_CONFIG = {
  calco: { url: "models/calco.nxz", color: [0.93, 0.90, 0.85], vertexColors: false },
  cartapesta: { url: "models/cartapesta.nxz", color: [0.79, 0.71, 0.54], vertexColors: false },
  colore: { url: "models/colore.nxz", color: [1.0, 1.0, 1.0], vertexColors: false }
};

// Matrice di rotazione per correggere il conflitto assi NXZ/PLY.
const fixMatrix = SglMat4.rotationAngleAxis(sglDegToRad(-90), [1.0, 0.0, 0.0]);

// Configurazione Hotspot divisa per fase
const HOTSPOTS_CONFIG = {
  calco: {
    "spot_gesso": { label: "Forma in gesso", mesh: "marker_gesso", color: [1.0, 0.3, 0.24], transform: { matrix: fixMatrix }, alpha: 0.8, alphaHigh: 1.0 },
    "spot_polistirolo": { label: "Protezione in polistirolo espanso", mesh: "marker_polistirolo", color: [0.2, 0.6, 0.9], transform: { matrix: fixMatrix }, alpha: 0.8, alphaHigh: 1.0 },
    "spot_legno": { label: "Struttura in legno", mesh: "marker_legno", color: [0.3, 0.8, 0.3], transform: { matrix: fixMatrix }, alpha: 0.8, alphaHigh: 1.0 }
  },
  cartapesta: {},
  colore: {
    "anno_opera": { label: "2021 indica l'anno di realizzazione dell'opera", mesh: "marker_2021", color: [0.9, 0.4, 0.1], transform: { matrix: fixMatrix }, alpha: 0.8, alphaHigh: 1.0 }
  }
};

// Mappatura viste 3DHOP [Phi, Theta, PanX, PanY, PanZ, Distance]
const VIEWS_TRACKBALL = {
  "fronte": [0.0, -10.0, 0.0, 0.0, 0.0, 3.0],
  "retro": [180.0, -10.0, 0.0, 0.0, 0.0, 3.0]
};

const PHASE_MODELS = ["calco", "cartapesta", "colore"];
const TRACKBALL_DIST_RANGE = [0.5, 3.0]; // Limiti distanza zoom

// Variabili di stato
let presenter = null;
let currentModelType = null, pendingModelType = null, modelLoading = false;
let rotateTicking = false, lastScrollY = window.scrollY;
let lastPointerX = 0, lastPointerY = 0;
let phaseElements = [], currentPhaseIndex = -1;

// Helper: recupero elementi ricorrenti e gestione stato "aria-pressed"
const $id = id => document.getElementById(id);
const $canvas = () => $id("draw-canvas");
const setPressed = (el, state) => el?.setAttribute("aria-pressed", String(state));
const isPressed = el => el?.getAttribute("aria-pressed") === "true";
const debounce = (fn, delay) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), delay); }; };

// ==========================================================
// 2. INIZIALIZZAZIONE
// ==========================================================
$(document).ready(() => {
  initScrollAnimations();
  initHeroCanvas();
  init3DViewer();
  initViewerUI();
  initStagedReveal();
});

// ==========================================================
// 3. ANIMAZIONI SCROLL E HERO CANVAS
// ==========================================================
function initScrollAnimations() {
  const elements = document.querySelectorAll(".section__label, .section__body, .step, .timeline__item, .patrimonio__note");
  elements.forEach(el => el.classList.add("reveal"));

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("is-visible");
        obs.unobserve(e.target);
      }
    });
  }, { root: null, rootMargin: "0px", threshold: 0.15 });

  elements.forEach(el => obs.observe(el));
}

function initHeroCanvas() {
  const canvas = $id("confetti-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d"), colors = ["#D9A441", "#C1622B", "#FF4B3E", "#EDE6D8", "#C9B48A"];
  let width, height, pieces = [];

  const resize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };

  window.addEventListener("resize", debounce(resize, 250));
  resize();

  class Confetto {
    constructor(recycle) { this.reset(recycle); }
    reset(recycle) {
      this.baseX = Math.random() * width; this.x = this.baseX;
      this.y = recycle ? -30 : Math.random() * height;
      this.size = Math.random() * 10 + 10;
      this.aspect = Math.random() * 0.5 + 0.55;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.opacity = Math.random() * 0.35 + 0.55;
      this.fallSpeed = Math.random() * 0.55 + 0.45;
      this.swayAmplitude = Math.random() * 55 + 25;
      this.swaySpeed = Math.random() * 0.004 + 0.002;
      this.swayOffset = Math.random() * Math.PI * 2;
      this.angle = Math.random() * Math.PI * 2;
      this.spin = (Math.random() - 0.5) * 0.028;
      this.flip = Math.random() * Math.PI * 2;
      this.flipSpeed = Math.random() * 0.015 + 0.006;
    }
    update(t) {
      this.y += this.fallSpeed; this.angle += this.spin; this.flip += this.flipSpeed;
      this.x = this.baseX + Math.sin(t * this.swaySpeed + this.swayOffset) * this.swayAmplitude;
      if (this.y > height + 30) this.reset(true);
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.opacity; ctx.translate(this.x, this.y); ctx.rotate(this.angle);
      ctx.scale(Math.max(0.12, Math.abs(Math.cos(this.flip))), 1);
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.size / 2, -(this.size * this.aspect) / 2, this.size, this.size * this.aspect);
      ctx.restore();
    }
  }

  pieces = Array.from({ length: window.innerWidth < 768 ? 30 : 55 }, () => new Confetto(false));
  const animate = (t) => {
    ctx.clearRect(0, 0, width, height);
    pieces.forEach(p => { p.update(t); p.draw(); });
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}

// ==========================================================
// 4. SETUP MOTORE 3DHOP E FUNZIONI SCROLL MODELLO
// ==========================================================
function init3DViewer() {
  if (typeof init3dhop === "function") init3dhop();
  const canvasEl = $canvas();
  if (!canvasEl) return;

  presenter = new Presenter("draw-canvas");
  presenter._resizable = false;
  fixCanvasResolution();

  window.addEventListener("resize", debounce(fixCanvasResolution, 250));

  // Gestione Hotspots e Tooltips Dinamici
  let tooltipTimeout;
  presenter._onPickedSpot = (id) => {
    const label = $id("spot-label");
    const spotData = HOTSPOTS_CONFIG[currentModelType]?.[id];

    if (!label || !spotData) return;

    label.innerHTML = spotData.label;
    label.hidden = false;
    label.style.left = `${lastPointerX}px`;
    label.style.top = `${lastPointerY}px`;
    requestAnimationFrame(() => label.classList.add("is-visible"));

    clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(() => {
      label.classList.remove("is-visible");
      setTimeout(() => label.hidden = true, 220);
    }, 3000);
  };

  // Cambio cursore al passaggio del mouse sui marker
  presenter._onEnterSpot = () => $canvas()?.classList.add("cursor-pointer");
  presenter._onLeaveSpot = () => $canvas()?.classList.remove("cursor-pointer");

  // Tracciamento posizione click per etichette
  ["mousedown", "touchstart"].forEach(evt => {
    canvasEl.addEventListener(evt, e => {
      const point = e.touches ? e.touches[0] : e;
      lastPointerX = point.clientX;
      lastPointerY = point.clientY;
    }, { passive: true });
  });

  loadModel3D("calco");

  // Rotazione modello tramite scroll
  window.addEventListener("scroll", () => {
    if (!rotateTicking) {
      requestAnimationFrame(rotateOnScroll);
      rotateTicking = true;
    }
  }, { passive: true });
}

function fixCanvasResolution() {
  const container = $id('3dhop'), canvas = $canvas();
  if (container && canvas) {
    container.style.width = '100%'; container.style.height = '';
    canvas.width = container.clientWidth; canvas.height = container.clientHeight;
    presenter?.repaint();
  }
}

function loadModel3D(modelType) {
  if (!presenter || modelType === currentModelType) return;
  // Non sovrapporre setScene multipli
  if (modelLoading) return pendingModelType = modelType, void 0;

  modelLoading = true;
  currentModelType = modelType;

  const cfg = MODEL_CONFIG[modelType];
  const modelHotspots = HOTSPOTS_CONFIG[modelType] || {};
  const hasHotspots = Object.keys(modelHotspots).length > 0;

  const label = $id("spot-label");
  if (label) label.hidden = true;

  // Ripristina l'UI di Fronte/Retro ad ogni cambio di fase
  document.querySelectorAll(".views-list .view-text-btn").forEach(btn => {
    setPressed(btn, btn.dataset.view === "fronte");
  });

  // Mostra/Nascondi dinamicamente il pulsante hotspot
  const hotspotBtn = document.querySelector('.vtb[data-action="hotspot"]');
  if (hotspotBtn) {
    hotspotBtn.style.display = hasHotspots ? "flex" : "none";
    setPressed(hotspotBtn, false);
  }

  // Reset disattivazione luce e cursore al cambio tab
  const lightBtn = document.querySelector('.vtb[data-action="light"]');
  if (lightBtn) {
    setPressed(lightBtn, false);
    $canvas()?.classList.remove("cursor-move");
  }

  const sceneData = {
    meshes: { "mesh_current": { url: cfg.url } },
    modelInstances: { "model_current": { mesh: "mesh_current", color: cfg.color, useVertexColors: cfg.vertexColors } },
    trackball: {
      type: TurntablePanTrackball,
      trackOptions: {
        startPhi: VIEWS_TRACKBALL.fronte[0],
        startTheta: VIEWS_TRACKBALL.fronte[1],
        startDistance: VIEWS_TRACKBALL.fronte[5],
        minMaxPhi: [-180, 180],
        minMaxTheta: [-180.0, 180.0],
        minMaxDist: TRACKBALL_DIST_RANGE
      }
    }
  };

  // Carica i marker multipli dinamicamente solo se la fase ne ha
  if (hasHotspots) {
    // Estrapola tutti i nomi univoci delle mesh usate nei marker di questa fase
    const uniqueMarkers = new Set(Object.values(modelHotspots).map(spot => spot.mesh));
    // Inietta ogni file .ply necessario dentro le meshes della scena
    uniqueMarkers.forEach(meshId => sceneData.meshes[meshId] = { url: `models/${meshId}.ply` });
    sceneData.spots = modelHotspots;
  }

  try {
    presenter.setScene(sceneData);
    if (hasHotspots) {
      presenter.setSpotVisibility(HOP_ALL, false, true);
      presenter.enableOnHover(true);
    }
  } catch (err) { console.error("Errore 3D:", err); }

  const startTime = Date.now();
  const waitReady = setInterval(() => {
    if (!presenter?._sceneReady && (Date.now() - startTime <= 6000)) return;
    clearInterval(waitReady);
    modelLoading = false;

    // Carica l'eventuale modello accodato nel frattempo
    if (pendingModelType && pendingModelType !== currentModelType) {
      loadModel3D(pendingModelType);
    }
    pendingModelType = null;
  }, 100);
}

// Calcolo fase narrazione e rotazione
function initStagedReveal() {
  phaseElements = Array.from(document.querySelectorAll(".phase"));
  if (phaseElements.length) updateActivePhase();
}

function updateActivePhase() {
  if (!phaseElements.length) return;
  const mid = window.innerHeight * 0.5;
  const activeIndex = phaseElements.reduce((acc, phase, i) => phase.getBoundingClientRect().top <= mid ? i : acc, 0);

  if (activeIndex !== currentPhaseIndex) {
    currentPhaseIndex = activeIndex;
    const modelType = PHASE_MODELS[activeIndex];
    document.querySelectorAll(".viewer-tab").forEach(t => t.classList.toggle("is-active", t.dataset.model === modelType));
    loadModel3D(modelType);
  }
}

function rotateOnScroll() {
  rotateTicking = false;
  updateActivePhase();

  if (!presenter?.getTrackballPosition) return;
  const scrollY = window.scrollY, delta = scrollY - lastScrollY;
  lastScrollY = scrollY;

  // Rotazione fluida e zoom su scroll
  if (delta && window.matchMedia("(pointer: fine)").matches && window.innerWidth > 980) {
    const state = presenter.getTrackballPosition();

    // 1. Applica la rotazione orizzontale
    state[0] += delta * 0.12;

    // 2. Calcola il nuovo zoom (distanza).
    // Un delta positivo (scroll in giù) moltiplicato per un negativo riduce la distanza -> avvicina il modello.
    let newDist = state[5] + (delta * -0.0005);

    // 3. Mantiene la distanza rigorosamente entro i nostri limiti (0.5 - 3.0)
    const [minDist, maxDist] = TRACKBALL_DIST_RANGE;
    state[5] = Math.max(minDist, Math.min(maxDist, newDist));

    // 4. Invia le nuove coordinate a 3DHOP
    presenter.setTrackballPosition(state);

    // 5. Sincronizza lo slider UI con il nuovo livello di zoom
    if (typeof onTrackballUpdate === "function") onTrackballUpdate(state);
  }
}

// API NATIVA 3DHOP per sync dello slider
function onTrackballUpdate(state) {
  // state = [Phi, Theta, PanX, PanY, PanZ, Distance]
  const distance = state[5];

  if (window.__zoomSlider && !window.__zoomSliderState?.dragging) {
    const [min, max] = TRACKBALL_DIST_RANGE;
    const t = 1 - (Math.min(max, Math.max(min, distance)) - min) / (max - min);
    window.__zoomSlider.value = Math.round(t * 100);
  }
}

// ==========================================================
// 5. INTERFACCIA UTENTE (Event Listeners e UI unificata)
// ==========================================================
function initViewerUI() {

  // TABS PRINCIPALI (Cambio fase manuale)
  document.querySelectorAll(".viewer-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const modelType = tab.dataset.model;
      document.querySelectorAll(".viewer-tab").forEach(t => t.classList.toggle("is-active", t.dataset.model === modelType));
      loadModel3D(modelType);
    });
  });

  // Funzione di supporto per mostrare/nascondere il tasto sposta-luce
  const updateLightButtonVisibility = () => {
    const lightingBtn = document.querySelector('.vtb[data-action="lighting"]');
    const lightBtn = document.querySelector('.vtb[data-action="light"]');
    if (!lightingBtn || !lightBtn) return;

    const isLightingActive = isPressed(lightingBtn);
    lightBtn.style.display = isLightingActive ? "flex" : "none";
    if (!isLightingActive) {
      setPressed(lightBtn, false);
      presenter?.enableLightTrackball(false);
      $canvas()?.classList.remove("cursor-move");
    }
  };

  // TOOLBAR PRINCIPALE (Comandi Scena)
  let orthographic = false;
  document.querySelectorAll("#viewer-toolbar .vtb[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!presenter) return;
      const action = btn.dataset.action;

      if (action === "lighting") {
        const newState = !presenter.isSceneLightingEnabled();
        presenter.enableSceneLighting(newState);
        setPressed(btn, newState);
        updateLightButtonVisibility();
      } else if (action === "light") {
        const newState = !isPressed(btn);
        presenter.enableLightTrackball(newState);
        setPressed(btn, newState);

        // Aggiunge o rimuove il cursore 'move' al canvas
        $canvas()?.classList.toggle("cursor-move", newState);
      } else if (action === "color") {
        presenter.toggleInstanceSolidColor(HOP_ALL, true);
        setPressed(btn, !isPressed(btn));
      } else if (action === "camera") {
        presenter.toggleCameraType();
        orthographic = !orthographic;
        setPressed(btn, orthographic);
      } else if (action === "hotspot") {
        const newState = !isPressed(btn);
        presenter.setSpotVisibility(HOP_ALL, newState, true);
        presenter.enableOnHover(newState);
        setPressed(btn, newState);
      } else if (action === "screenshot") presenter.saveScreenshot();
    });
  });

  // SELEZIONE VISTE (Fronte, Retro)
  const viewButtons = document.querySelectorAll(".views-list .view-text-btn");
  viewButtons.forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      viewButtons.forEach(b => setPressed(b, false));
      setPressed(btn, true);

      const viewType = btn.dataset.view;
      if (presenter && VIEWS_TRACKBALL[viewType]) presenter.animateToTrackballPosition(VIEWS_TRACKBALL[viewType]);
    });
  });

  // CONTROLLI ZOOM CON CALCOLO MATEMATICO DIRETTO
  const zoomSlider = $id("viewer-zoom-slider");
  if (zoomSlider) {
    let sliderDragging = false;

    zoomSlider.addEventListener("input", () => {
      if (!presenter || !presenter.getTrackballPosition) return;

      const value = Number(zoomSlider.value);
      const [min, max] = TRACKBALL_DIST_RANGE;

      // Calcola la distanza esatta proporzionale al range dello slider (0-100)
      const t = value / 100;

      // Iniettala direttamente nello stato della trackball
      const state = presenter.getTrackballPosition();
      state[5] = max - (t * (max - min));
      presenter.setTrackballPosition(state);
    });

    zoomSlider.addEventListener("pointerdown", () => { sliderDragging = true; });
    window.addEventListener("pointerup", () => { sliderDragging = false; });

    // Esposizione per sync bidirezionale con rotella/pinch (onTrackballUpdate)
    window.__zoomSlider = zoomSlider;
    window.__zoomSliderState = { get dragging() { return sliderDragging; } };
  }

  // FULLSCREEN
  const fsBtn = $id("viewer-fullscreen");
  const fsIcon = $id("fullscreen-icon");
  const viewerEl = $id("3dhop");
  const MAXIMIZE = '<path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />';
  const MINIMIZE = '<path d="M9 4v4a1 1 0 0 1-1 1H4M15 4v4a1 1 0 0 0 1 1h4M9 20v-4a1 1 0 0 0-1-1H4M15 20v-4a1 1 0 0 1 1-1h4" />';

  if (fsBtn && viewerEl) {
    fsBtn.addEventListener("click", () => {
      if (!document.fullscreenElement) viewerEl.requestFullscreen?.();
      else document.exitFullscreen?.();
    });

    document.addEventListener("fullscreenchange", () => {
      const isFs = !!document.fullscreenElement;
      if (fsIcon) fsIcon.innerHTML = isFs ? MINIMIZE : MAXIMIZE;
      setPressed(fsBtn, isFs);
      fixCanvasResolution();
    });
  }
}