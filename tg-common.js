/* tg-common.js  (shared between index.html and game.html)
   - Auth panel UI + logout flow (with position-close warning)
   - Email masking
   - Activity index + grade display
   - Info box collapse/expand (default expanded)
   - Emergency reset link (always visible inside info box)
   - IMPORTANT: Avoids re-render jitter by building DOM once and updating text only
*/
(function(){
  "use strict";

  // ===== Auth metrics (Equity / ROI) =====
  let _equity = null;
  let _roi = null; // percent value, e.g. -0.19 means -0.19%

  // ===== Activity / Grade =====
  let _activity = null; // number

  function fmtMoney(v){
    if (typeof v !== "number" || !isFinite(v)) return "";
    return "$" + v.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function fmtPct(v){
    if (typeof v !== "number" || !isFinite(v)) return "";
    return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
  }

  function fmtAct(v){
    if (typeof v !== "number" || !isFinite(v)) return "-";
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
    if (v >= 10_000)    return Math.round(v / 1000) + "K";
    if (v >= 1000)      return (v / 1000).toFixed(1) + "K";
    return (v % 1 === 0) ? String(v) : v.toFixed(1);
  }

  function loadMetrics(){
    try{
      const e = Number(localStorage.getItem("tg_metric_equity"));
      const r = Number(localStorage.getItem("tg_metric_roi"));
      _equity = isFinite(e) ? e : null;
      _roi = isFinite(r) ? r : null;
    }catch(e){}
  }

  function loadActivity(){
    try{
      const raw = localStorage.getItem("tg_activity_index");
      if (raw === null || raw === "") { _activity = null; return; }
      const a = Number(raw);
      _activity = isFinite(a) ? a : null;
    }catch(e){}
  }

  function gradeFromActivity(v){
    if (typeof v !== "number" || !isFinite(v) || v < 0) return "-";
    if (v <= 10)  return "Beginner 🐣";
    if (v <= 20)  return "Rookie 🌱";
    if (v <= 35)  return "Learner 📘";
    if (v <= 60)  return "Skilled 🛠️";
    if (v <= 100) return "Pro 🔥";
    if (v <= 160) return "Expert 🎯";
    if (v <= 260) return "Elite 💎";
    if (v <= 500) return "Master 🧠";
    if (v <= 1000) return "World Class 🌍";
    return "God 👑";
  }

  function setAuthMetrics(equity, roi){
    try{
      _equity = (typeof equity === "number" && isFinite(equity)) ? equity : null;
      _roi = (typeof roi === "number" && isFinite(roi)) ? roi : null;
      if (_equity !== null) localStorage.setItem("tg_metric_equity", String(_equity));
      if (_roi !== null) localStorage.setItem("tg_metric_roi", String(_roi));
    }catch(e){}
  }

  function setAuthActivity(activityIndex){
    try{
      _activity = (typeof activityIndex === "number" && isFinite(activityIndex)) ? activityIndex : null;
      if (_activity !== null) localStorage.setItem("tg_activity_index", String(_activity));
      if (window.TG_COMMON && typeof window.TG_COMMON._updateAuthPanel === "function") {
        window.TG_COMMON._updateAuthPanel(true);
      }
    }catch(e){}
  }

  loadMetrics();
  loadActivity();

  function maskedEmail(){
    const email = (localStorage.getItem("registeredEmail") || "").trim();
    if (!email.includes("@")) return "";
    const p = (email.split("@")[0] || "");
    const n = Math.min(5, Math.max(3, p.length));
    return p.slice(0, n) + "***";
  }

  function clearAuth(){
    try{
      localStorage.removeItem("btc_user_done");
      localStorage.removeItem("registeredEmail");
      localStorage.removeItem("registeredName");
      localStorage.removeItem("tg_activity_index");
    }catch(e){}
  }

  function attachAuthPanel(opts){
    const panel = document.getElementById(opts.panelId);
    if (!panel) return function(){};

    panel.style.cursor = "pointer";
    panel.style.userSelect = "none";

    function doLogout(){
      clearAuth();
      try{ opts.onAfterLogout && opts.onAfterLogout(); }catch(e){}
    }

    function requestLogout(){
      try{
        if (!opts.getAuthed || opts.getAuthed() !== true) return;

        const hasPos = !!(opts.getHasPos && opts.getHasPos());
        if (hasPos){
          const msg =
`인증 해제 전에 포지션 정리해야 기록 반영

지금 인증을 해제하면
열려 있는 포지션은 기록되지 않습니다.`;

          if (!confirm(msg + "\n\n[확인] 포지션 정리하고 인증 해제\n[취소] 유지")) return;
          try{ opts.onExitPos && opts.onExitPos(); }catch(e){}
          setTimeout(doLogout, 350);
          return;
        }

        if (confirm("인증을 해제할까요?")) doLogout();
      }catch(e){}
    }

    if (!panel.dataset.bound){
      panel.dataset.bound = "1";
      panel.addEventListener("click", function(){ requestLogout(); });
    }

    // Cache DOM refs to avoid rebuilding and jitter
    let dom = null;

    function ensureDom(head, m){
      // If not built yet or user changed, build once
      if (dom && dom.user === m) return dom;

      const collapsed = (localStorage.getItem("tg_info_collapsed") === "1");

      head.innerHTML = `
        <span style="pointer-events:none;">🔓<span data-tg="mask"></span>님</span>
        <span style="text-decoration:underline; color:#f3ba2f; font-weight:900;">(Log out)</span>
        <span data-tg="toggle"
              style="
                margin-left:2px;
                padding:2px 8px;
                font-size:10px;
                font-weight:700;
                border:1px solid #3a3f4b;
                border-radius:999px;
                background:#1b1f2a;
                color:#d1d4dc;
                cursor:pointer;
                user-select:none;
              "
              title="Show/Hide info">${collapsed ? "▸ Info" : "▾ Info"}</span>

        <span class="tg-stats" style="font-weight:900; display:block; margin-top:6px;">
          <span data-tg="box"
                style="
                  display:block;
                  overflow:hidden;
                  max-height:${collapsed ? "0px" : "999px"};
                  transition:max-height 0.18s ease;
                ">
            <div data-tg="eq" style="color:#ff8a00;">[Equity -]</div>
            <div data-tg="roi" style="color:#848e9c;">[ROI -]</div>
            <div data-tg="act" style="color:#848e9c;">[Activity evaluating…]</div>

            <div style="margin-top:6px; font-size:10px; color:#848e9c; line-height:1.4;">
              If data looks delayed or incorrect,<br>
              <a href="javascript:(function(){localStorage.clear();location.reload();})();"
                 style="color:#f3ba2f; text-decoration:underline;"
                 onclick="event.stopPropagation();">
                click here to reset and reload
              </a>.<br>
              It will clear all locally saved data<br>in your browser.
            </div>
          </span>
        </span>
      `;

      const q = (sel) => head.querySelector(sel);

      dom = {
        user: m,
        mask: q('[data-tg="mask"]'),
        toggle: q('[data-tg="toggle"]'),
        box: q('[data-tg="box"]'),
        eq: q('[data-tg="eq"]'),
        roi: q('[data-tg="roi"]'),
        act: q('[data-tg="act"]'),
      };

      if (dom.mask) dom.mask.textContent = m;

      // Bind toggle once
      if (dom.toggle && !dom.toggle.dataset.bound){
        dom.toggle.dataset.bound = "1";
        dom.toggle.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          const isCollapsed = (localStorage.getItem("tg_info_collapsed") === "1");
          const next = !isCollapsed;

          localStorage.setItem("tg_info_collapsed", next ? "1" : "0");

          // Apply immediately (no flicker / no jitter)
          if (dom.box){
            dom.box.style.maxHeight = next ? "0px" : "999px";
          }
          dom.toggle.textContent = next ? "▸ Info" : "▾ Info";
        });
      }

      return dom;
    }

    function update(authed){
      try{
        if (!authed) { panel.style.display = "none"; return; }

        const m = maskedEmail();
        if (!m) { panel.style.display = "none"; return; }

        loadActivity();

        const head = panel.firstElementChild;
        if (!head) { panel.style.display = "none"; return; }

        const D = ensureDom(head, m);
        if (D.mask) D.mask.textContent = m;

        // Update values WITHOUT rebuilding HTML (prevents shaking)
        const eqTxt = fmtMoney(_equity) || "-";
        const roiTxt = fmtPct(_roi) || "-";
        const roiColor = (_roi === null) ? "#848e9c" : (_roi >= 0 ? "#02c076" : "#cf304a");

        if (D.eq)  D.eq.textContent  = `[Equity ${eqTxt}]`;
        if (D.roi){
          D.roi.textContent = `[ROI ${roiTxt}]`;
          D.roi.style.color = roiColor;
        }

        const hasAct = (typeof _activity === "number" && isFinite(_activity));
        if (D.act){
          if (hasAct){
            const actTxt = fmtAct(_activity);
            const gradeTxt = gradeFromActivity(_activity);
            D.act.textContent = `[Activity ${actTxt}p, ${gradeTxt}]`;
            D.act.style.color = "#d1d4dc";
          }else{
            D.act.textContent = `[Activity evaluating…]`;
            D.act.style.color = "#848e9c";
          }
        }

        panel.style.display = "block";
      }catch(e){}
    }

    return update;
  }

  window.TG_COMMON = window.TG_COMMON || {};
  window.TG_COMMON.maskedEmail = maskedEmail;
  window.TG_COMMON.attachAuthPanel = attachAuthPanel;
  window.TG_COMMON.setAuthMetrics = setAuthMetrics;
  window.TG_COMMON.setAuthActivity = setAuthActivity;
})();
