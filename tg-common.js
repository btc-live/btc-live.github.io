/* tg-common.js  (shared between index.html and game.html)
   - Auth panel UI + logout flow (with position-close warning)
   - Email masking
*/
(function(){
  "use strict";

  // ===== Auth metrics (Equity / ROI) =====
  // Stored in-memory + localStorage so both index/game can reuse.
  let _equity = null;
  let _roi = null; // percent value, e.g. -0.19 means -0.19%

  function fmtMoney(v){
    if (typeof v !== "number" || !isFinite(v)) return "";
    return "$" + v.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function fmtPct(v){
    if (typeof v !== "number" || !isFinite(v)) return "";
    // v already represents percent value
    return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
  }

  function loadMetrics(){
    try{
      const e = Number(localStorage.getItem("tg_metric_equity"));
      const r = Number(localStorage.getItem("tg_metric_roi"));
      _equity = isFinite(e) ? e : null;
      _roi = isFinite(r) ? r : null;
    }catch(e){}
  }

  function setAuthMetrics(equity, roi){
    try{
      _equity = (typeof equity === "number" && isFinite(equity)) ? equity : null;
      _roi = (typeof roi === "number" && isFinite(roi)) ? roi : null;
      if (_equity !== null) localStorage.setItem("tg_metric_equity", String(_equity));
      if (_roi !== null) localStorage.setItem("tg_metric_roi", String(_roi));
    }catch(e){}
  }

  loadMetrics();

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

    function update(authed){
      try{
        if (!authed) { panel.style.display = "none"; return; }

        const m = maskedEmail();
        if (!m) { panel.style.display = "none"; return; }

        const head = panel.firstElementChild;
        if (head){
          // Metrics string (optional)
          const eqTxt = fmtMoney(_equity);
          const roiTxt = fmtPct(_roi);
          const hasMetrics = !!(eqTxt || roiTxt);

          const eqColor = "#ff8a00"; // orange: high contrast on dark bg
          const roiColor = (_roi === null) ? "#848e9c" : (_roi >= 0 ? "#02c076" : "#cf304a");

          head.innerHTML =
            `<span style="pointer-events:none;">🔓 트레이더 ${m} 님 </span>` +
            `<span style="text-decoration:underline; color:#f3ba2f; font-weight:900;">(인증 해제)</span>` +
            (hasMetrics
              ? ` <span class="tg-stats" style="font-weight:900; display:block; margin-top:6px;">
                    <div style="color:${eqColor};">[총자산 ${eqTxt || "-"}]</div>
                    <div style="color:${roiColor};">[순이익률 ${roiTxt || "-"}]</div>
                  </span>`
              : "");
            
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
})();