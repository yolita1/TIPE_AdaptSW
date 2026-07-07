(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Navigation mobile
  const navToggle = $(".nav-toggle");
  const navLinks = $$(".main-nav a");
  if (navToggle) {
    navToggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    navLinks.forEach((link) => link.addEventListener("click", () => {
      document.body.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
    }));
  }

  // Apparition progressive
  const revealItems = $$(".reveal");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("visible"));
  } else {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -5%" });
    revealItems.forEach((item) => observer.observe(item));
  }

  // Fonctions mathématiques du document
  function pDelivery(L, lambda, q, ttl) {
    return 1 - Math.pow(q, L - 1) * Math.exp(-lambda * ttl);
  }

  function tCost(L, pL, q) {
    const d = 1 - Math.pow(q, L - 1);
    return d > 1e-9 ? (L - 1) + pL / d : 1;
  }

  function rScore(L, lambda, q, ttl) {
    const p = pDelivery(L, lambda, q, ttl);
    const t = tCost(L, p, q);
    return t > 1e-9 ? p / t : 0;
  }

  function computeLStar(lambda, n, ttl) {
    const safeN = Math.max(2, Math.round(n));
    const q = Math.max(1 - 1 / (safeN - 1), 1e-6);
    let bestL = 1;
    let best = -Infinity;
    for (let L = 1; L <= safeN; L += 1) {
      const score = rScore(L, Math.max(lambda, 1e-8), q, ttl);
      if (score > best) {
        best = score;
        bestL = L;
      }
    }
    return bestL;
  }

  // Graphique interactif
  const chart = $("#model-chart");
  if (chart) {
    const lambdaRange = $("#lambda-range");
    const ttlRange = $("#ttl-range");
    const nodesRange = $("#nodes-range");
    const lambdaOutput = $("#lambda-output");
    const ttlOutput = $("#ttl-output");
    const nodesOutput = $("#nodes-output");
    const lstarOutput = $("#lstar-output");

    function fitCanvas(canvas, ratio = 0.57, minHeight = 290) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssWidth = Math.max(280, canvas.parentElement.clientWidth);
      const cssHeight = Math.max(minHeight, cssWidth * ratio);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, width: cssWidth, height: cssHeight };
    }

    function drawChart() {
      const lambda = Number(lambdaRange.value);
      const ttl = Number(ttlRange.value);
      const n = Number(nodesRange.value);
      const q = Math.max(1 - 1 / (n - 1), 1e-6);
      const values = [];

      for (let L = 1; L <= n; L += 1) {
        const p = pDelivery(L, lambda, q, ttl);
        const t = tCost(L, p, q);
        const r = p / t;
        values.push({ L, p, t, r });
      }

      const maxT = Math.max(...values.map((v) => v.t), 1);
      const maxR = Math.max(...values.map((v) => v.r), 1e-9);
      const lStar = values.reduce((best, value) => value.r > best.r ? value : best, values[0]).L;

      lambdaOutput.value = lambda.toLocaleString("fr-FR", { minimumFractionDigits: 5, maximumFractionDigits: 5 });
      ttlOutput.value = String(ttl);
      nodesOutput.value = String(n);
      lstarOutput.textContent = String(lStar);

      const { ctx, width, height } = fitCanvas(chart);
      ctx.clearRect(0, 0, width, height);

      const pad = { left: 48, right: 20, top: 26, bottom: 43 };
      const plotW = width - pad.left - pad.right;
      const plotH = height - pad.top - pad.bottom;
      const x = (L) => pad.left + ((L - 1) / Math.max(1, n - 1)) * plotW;
      const y = (value) => pad.top + (1 - value) * plotH;

      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.11)";
      ctx.fillStyle = "rgba(220,229,230,0.64)";
      ctx.font = "11px ui-monospace, monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      for (let i = 0; i <= 4; i += 1) {
        const value = i / 4;
        const py = y(value);
        ctx.beginPath();
        ctx.moveTo(pad.left, py);
        ctx.lineTo(width - pad.right, py);
        ctx.stroke();
        ctx.fillText(value.toFixed(2).replace(".", ","), pad.left - 9, py);
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const labelStep = n > 18 ? 3 : n > 10 ? 2 : 1;
      values.forEach((value) => {
        if ((value.L - 1) % labelStep === 0 || value.L === n) {
          ctx.fillText(String(value.L), x(value.L), height - pad.bottom + 10);
        }
      });
      ctx.fillStyle = "rgba(220,229,230,0.72)";
      ctx.fillText("nombre de copies L", pad.left + plotW / 2, height - 14);

      const series = [
        { key: "p", color: "#f1aa9d", normalize: (v) => v.p },
        { key: "t", color: "#9db8c2", normalize: (v) => v.t / maxT },
        { key: "r", color: "#98c4a8", normalize: (v) => v.r / maxR }
      ];

      series.forEach((serie) => {
        ctx.beginPath();
        values.forEach((value, index) => {
          const px = x(value.L);
          const py = y(serie.normalize(value));
          if (index === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.strokeStyle = serie.color;
        ctx.lineWidth = serie.key === "r" ? 3 : 2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();
      });

      const starValue = values[lStar - 1];
      const starX = x(lStar);
      const starY = y(starValue.r / maxR);
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(starX, pad.top);
      ctx.lineTo(starX, height - pad.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(starX, starY, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#98c4a8";
      ctx.fill();
      ctx.strokeStyle = "#182226";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "#f7faf9";
      ctx.font = "bold 11px ui-monospace, monospace";
      ctx.textAlign = starX > width - 90 ? "right" : "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(`L* = ${lStar}`, starX + (starX > width - 90 ? -10 : 10), starY - 8);
    }

    [lambdaRange, ttlRange, nodesRange].forEach((input) => input.addEventListener("input", drawChart));
    window.addEventListener("resize", () => window.requestAnimationFrame(drawChart));
    drawChart();
  }

  // Simulation pédagogique
  const simCanvas = $("#network-sim");
  if (simCanvas) {
    const modeSelect = $("#sim-mode");
    const countRange = $("#sim-count");
    const densityRange = $("#sim-density");
    const countOutput = $("#sim-count-output");
    const densityOutput = $("#sim-density-output");
    const toggleButton = $("#sim-toggle");
    const resetButton = $("#sim-reset");
    const statusOutput = $("#sim-status");
    const timeOutput = $("#sim-time");
    const contactsOutput = $("#sim-contacts");
    const lambdaSimOutput = $("#sim-lambda");
    const lstarSimOutput = $("#sim-lstar");
    const carriersOutput = $("#sim-carriers");
    const transmissionsOutput = $("#sim-transmissions");

    const state = {
      nodes: [],
      activePairs: new Set(),
      pulses: [],
      contacts: [],
      elapsed: 0,
      paused: false,
      delivered: false,
      transmissions: 0,
      width: 0,
      height: 0,
      lastFrame: performance.now(),
      lambda: 0.0003,
      lStar: 3,
      ttl: 42,
      initialTtlForModel: 300
    };

    function simSize() {
      const wrap = simCanvas.parentElement;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(300, wrap.clientWidth);
      const height = window.innerWidth <= 650 ? 390 : window.innerWidth <= 860 ? 450 : 520;
      const oldW = state.width || width;
      const oldH = state.height || height;
      state.nodes.forEach((node) => {
        node.x *= width / oldW;
        node.y *= height / oldH;
      });
      state.width = width;
      state.height = height;
      simCanvas.style.width = `${width}px`;
      simCanvas.style.height = `${height}px`;
      simCanvas.width = Math.round(width * dpr);
      simCanvas.height = Math.round(height * dpr);
      const ctx = simCanvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return ctx;
    }

    let simCtx = simSize();

    function rand(min, max) {
      return min + Math.random() * (max - min);
    }

    function createNode(index, total) {
      const margin = 34;
      let x;
      let y;
      if (index === 0) {
        x = Math.max(margin, state.width * 0.12);
        y = state.height * 0.72;
      } else if (index === total - 1) {
        x = Math.min(state.width - margin, state.width * 0.88);
        y = state.height * 0.25;
      } else {
        const angle = ((index - 1) / Math.max(1, total - 2)) * Math.PI * 2 + rand(-0.3, 0.3);
        const radiusX = Math.min(state.width * 0.3, 230);
        const radiusY = Math.min(state.height * 0.28, 140);
        x = Math.min(state.width - margin, Math.max(margin, state.width / 2 + Math.cos(angle) * radiusX + rand(-38, 38)));
        y = Math.min(state.height - margin, Math.max(margin, state.height / 2 + Math.sin(angle) * radiusY + rand(-32, 32)));
      }
      const speed = rand(25, 49);
      const dir = rand(0, Math.PI * 2);
      return {
        index,
        x,
        y,
        vx: Math.cos(dir) * speed,
        vy: Math.sin(dir) * speed,
        copies: 0,
        flash: 0,
        phase: rand(0, Math.PI * 2)
      };
    }

    function densityLabel(value) {
      if (value < 75) return "faible";
      if (value < 105) return "moyenne";
      return "grande";
    }

    function estimatedLambdaFromSettings() {
      const range = Number(densityRange.value);
      const normalized = (range - 55) / 70;
      return 0.00008 + normalized * 0.00055;
    }

    function currentModeCopies(lambda, count) {
      switch (modeSelect.value) {
        case "direct": return 1;
        case "fixed4": return Math.min(4, count);
        case "fixed8": return Math.min(8, count);
        default: return computeLStar(lambda, count, state.initialTtlForModel);
      }
    }

    function resetSimulation() {
      const count = Number(countRange.value);
      state.nodes = Array.from({ length: count }, (_, index) => createNode(index, count));
      state.activePairs.clear();
      state.pulses = [];
      state.contacts = [];
      state.elapsed = 0;
      state.delivered = false;
      state.transmissions = 0;
      state.lambda = estimatedLambdaFromSettings();
      state.lStar = currentModeCopies(state.lambda, count);
      state.nodes[0].copies = state.lStar;
      state.lastFrame = performance.now();
      updateOutputs();
    }

    function pairKey(a, b) {
      return a < b ? `${a}:${b}` : `${b}:${a}`;
    }

    function transferMessage(a, b) {
      if (state.delivered) return;
      const destinationIndex = state.nodes.length - 1;
      let carrier = null;
      let receiver = null;

      if (a.copies > 0 && b.copies === 0) {
        carrier = a;
        receiver = b;
      } else if (b.copies > 0 && a.copies === 0) {
        carrier = b;
        receiver = a;
      } else {
        return;
      }

      if (receiver.index === destinationIndex) {
        receiver.copies = 1;
        state.delivered = true;
        state.transmissions += 1;
        carrier.flash = 1;
        receiver.flash = 1;
        state.pulses.push({ ax: carrier.x, ay: carrier.y, bx: receiver.x, by: receiver.y, life: 1 });
        return;
      }

      if (modeSelect.value === "direct" || carrier.copies <= 1) return;

      const ttlRemaining = Math.max(0, state.ttl - state.elapsed);
      let effectiveLimit = carrier.copies;
      if (modeSelect.value === "adapt") {
        effectiveLimit = Math.max(1, Math.floor(1 + (state.lStar - 1) * ttlRemaining / state.ttl));
      }
      const available = Math.min(carrier.copies, effectiveLimit);
      if (available <= 1) return;

      const given = Math.floor(available / 2);
      if (given < 1) return;
      carrier.copies -= given;
      receiver.copies = given;
      state.transmissions += 1;
      carrier.flash = 1;
      receiver.flash = 1;
      state.pulses.push({ ax: carrier.x, ay: carrier.y, bx: receiver.x, by: receiver.y, life: 1 });
    }

    function registerContact(a, b) {
      state.contacts.push(state.elapsed);
      transferMessage(a, b);
    }

    function updateModelEstimate() {
      const windowSeconds = 18;
      state.contacts = state.contacts.filter((time) => state.elapsed - time <= windowSeconds);
      const observedRate = state.contacts.length / (Math.max(1, state.nodes.length - 1) * windowSeconds);
      const visualScale = 0.035;
      const contactEstimate = observedRate * visualScale;
      const settingsPrior = estimatedLambdaFromSettings();
      state.lambda = Math.max(0.00001, 0.55 * settingsPrior + 0.45 * contactEstimate);
      state.lStar = currentModeCopies(state.lambda, state.nodes.length);
    }

    function updateNodes(dt) {
      const margin = 22;
      state.nodes.forEach((node, index) => {
        const drift = Math.sin(state.elapsed * 0.23 + node.phase) * 4;
        node.x += (node.vx + drift) * dt;
        node.y += node.vy * dt;
        if (node.x < margin || node.x > state.width - margin) {
          node.vx *= -1;
          node.x = Math.min(state.width - margin, Math.max(margin, node.x));
        }
        if (node.y < margin || node.y > state.height - margin) {
          node.vy *= -1;
          node.y = Math.min(state.height - margin, Math.max(margin, node.y));
        }
        node.flash = Math.max(0, node.flash - dt * 2.4);

        // La destination se déplace un peu moins vite pour rester lisible.
        if (index === state.nodes.length - 1) {
          node.x -= node.vx * dt * 0.22;
          node.y -= node.vy * dt * 0.22;
        }
      });
    }

    function detectContacts() {
      const range = Number(densityRange.value);
      const nowPairs = new Set();
      for (let i = 0; i < state.nodes.length; i += 1) {
        for (let j = i + 1; j < state.nodes.length; j += 1) {
          const a = state.nodes[i];
          const b = state.nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= range) {
            const key = pairKey(i, j);
            nowPairs.add(key);
            if (!state.activePairs.has(key)) registerContact(a, b);
          }
        }
      }
      state.activePairs = nowPairs;
    }

    function drawGrid(ctx) {
      ctx.clearRect(0, 0, state.width, state.height);
      ctx.fillStyle = "#ece8df";
      ctx.fillRect(0, 0, state.width, state.height);
      ctx.strokeStyle = "rgba(23,33,38,0.065)";
      ctx.lineWidth = 1;
      const grid = 42;
      for (let x = 0; x <= state.width; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, state.height);
        ctx.stroke();
      }
      for (let y = 0; y <= state.height; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(state.width, y);
        ctx.stroke();
      }
    }

    function drawContacts(ctx) {
      ctx.lineWidth = 1;
      state.activePairs.forEach((key) => {
        const [i, j] = key.split(":").map(Number);
        const a = state.nodes[i];
        const b = state.nodes[j];
        const carries = a.copies > 0 || b.copies > 0;
        ctx.strokeStyle = carries ? "rgba(201,82,62,0.35)" : "rgba(81,121,139,0.22)";
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    function drawPulses(ctx, dt) {
      state.pulses.forEach((pulse) => {
        pulse.life -= dt * 1.6;
        ctx.strokeStyle = `rgba(201,82,62,${Math.max(0, pulse.life)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pulse.ax, pulse.ay);
        ctx.lineTo(pulse.bx, pulse.by);
        ctx.stroke();
        const t = 1 - Math.max(0, pulse.life);
        const x = pulse.ax + (pulse.bx - pulse.ax) * t;
        const y = pulse.ay + (pulse.by - pulse.ay) * t;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#c9523e";
        ctx.fill();
      });
      state.pulses = state.pulses.filter((pulse) => pulse.life > 0);
    }

    function drawNodes(ctx) {
      const destinationIndex = state.nodes.length - 1;
      state.nodes.forEach((node) => {
        const isSource = node.index === 0;
        const isDestination = node.index === destinationIndex;
        const isCarrier = node.copies > 0 && !isDestination;
        const radius = isSource || isDestination ? 17 : 14;

        if (node.flash > 0) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 11 * node.flash, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(201,82,62,${node.flash * 0.14})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,253,250,0.88)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        if (isSource) ctx.fillStyle = "#c9523e";
        else if (isDestination) ctx.fillStyle = "#5f8f76";
        else if (isCarrier) ctx.fillStyle = "#51798b";
        else ctx.fillStyle = "#26343a";
        ctx.fill();

        ctx.fillStyle = "#fffdfa";
        ctx.font = "700 11px ui-sans-serif, system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(node.index + 1), node.x, node.y + 0.5);

        if (node.copies > 0 && !isDestination) {
          ctx.beginPath();
          ctx.arc(node.x + radius - 1, node.y - radius + 1, 9, 0, Math.PI * 2);
          ctx.fillStyle = "#fffdfa";
          ctx.fill();
          ctx.strokeStyle = "rgba(23,33,38,0.16)";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = "#172126";
          ctx.font = "700 9px ui-monospace, monospace";
          ctx.fillText(String(node.copies), node.x + radius - 1, node.y - radius + 1.5);
        }

        if (isSource || isDestination) {
          ctx.fillStyle = "rgba(23,33,38,0.7)";
          ctx.font = "700 9px ui-sans-serif, system-ui";
          ctx.textBaseline = "top";
          ctx.fillText(isSource ? "source" : "secours", node.x, node.y + radius + 9);
        }
      });
    }

    function updateOutputs() {
      countOutput.value = String(state.nodes.length || Number(countRange.value));
      densityOutput.value = densityLabel(Number(densityRange.value));
      timeOutput.textContent = `${state.elapsed.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
      contactsOutput.textContent = String(state.contacts.length);
      lambdaSimOutput.textContent = `${state.lambda.toLocaleString("fr-FR", { minimumFractionDigits: 5, maximumFractionDigits: 5 })} s⁻¹`;
      lstarSimOutput.textContent = String(state.lStar);
      carriersOutput.textContent = String(state.nodes.filter((node) => node.copies > 0).length);
      transmissionsOutput.textContent = String(state.transmissions);

      if (state.delivered) {
        statusOutput.textContent = "Message livré aux secours";
        statusOutput.classList.add("delivered");
      } else if (state.elapsed >= state.ttl) {
        statusOutput.textContent = "Message expiré";
        statusOutput.classList.remove("delivered");
      } else {
        statusOutput.textContent = "Message en circulation";
        statusOutput.classList.remove("delivered");
      }
    }

    function frame(now) {
      const rawDt = (now - state.lastFrame) / 1000;
      const dt = Math.min(0.05, Math.max(0, rawDt));
      state.lastFrame = now;

      if (!state.paused && !state.delivered && state.elapsed < state.ttl) {
        state.elapsed += dt;
        updateNodes(dt);
        detectContacts();
        updateModelEstimate();
      }

      drawGrid(simCtx);
      drawContacts(simCtx);
      drawPulses(simCtx, state.paused ? 0 : dt);
      drawNodes(simCtx);
      updateOutputs();
      window.requestAnimationFrame(frame);
    }

    toggleButton.addEventListener("click", () => {
      state.paused = !state.paused;
      toggleButton.textContent = state.paused ? "Reprendre" : "Pause";
      state.lastFrame = performance.now();
    });
    resetButton.addEventListener("click", resetSimulation);
    modeSelect.addEventListener("change", resetSimulation);
    countRange.addEventListener("input", () => {
      countOutput.value = countRange.value;
    });
    countRange.addEventListener("change", resetSimulation);
    densityRange.addEventListener("input", () => {
      densityOutput.value = densityLabel(Number(densityRange.value));
    });
    densityRange.addEventListener("change", resetSimulation);
    window.addEventListener("resize", () => {
      simCtx = simSize();
    });

    resetSimulation();
    window.requestAnimationFrame(frame);
  }
})();
