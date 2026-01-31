/* tg-common.js  (shared between index.html and game.html)
   - Auth panel UI + logout flow (with position-close warning)
   - Email masking
   - Activity index + grade display
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
    // interval 0.001 때문에 소수 3자리 권장
    return v.toFixed(3);
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
      if (raw === null || raw === "") {
        _activity = null;   // 값이 없으면 0으로 만들지 않음
        return;
      }
      const a = Number(raw);
      _activity = isFinite(a) ? a : null;
    }catch(e){}
  }


  function gradeFromActivity(v){
    if (typeof v !== "number" || !isFinite(v) || v < 1) return "-";
    if (v < 11) return "입문";
    if (v < 51) return "초반 참여";
    if (v < 101) return "정착";
    if (v < 201) return "적극";
    if (v < 501) return "헤비";
    if (v < 1001) return "파워";
    if (v < 2001) return "마스터";
    if (v < 5001) return "그랜드";
    if (v < 10001) return "레전드";
    return "🌍 월드클래스";
  }
  

  function setAuthMetrics(equity, roi){
    try{
      _equity = (typeof equity === "number" && isFinite(equity)) ? equity : null;
      _roi = (typeof roi === "number" && isFinite(roi)) ? roi : null;
      if (_equity !== null) localStorage.setItem("tg_metric_equity", String(_equity));
      if (_roi !== null) localStorage.setItem("tg_metric_roi", String(_roi));
    }catch(e){}
  }

  // ✅ 활동지수 저장 함수 (index/game에서 불러서 넣을 것)
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

      // (선택) 로그아웃 시 표시도 초기화
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

    function update(authed){
      try{
        if (!authed) { panel.style.display = "none"; return; }

        const m = maskedEmail();
        if (!m) { panel.style.display = "none"; return; }

        loadActivity(); // 최신 activityIndex 반영


        const head = panel.firstElementChild;
        if (head){
          const eqTxt = fmtMoney(_equity);
          const roiTxt = fmtPct(_roi);

          const hasAct = (typeof _activity === "number" && isFinite(_activity));

          const actTxt = fmtAct(_activity);
          const gradeTxt = gradeFromActivity(_activity);

          const hasAny = true; // 항상 stats 블록 보여주기


          const eqColor = "#ff8a00";
          const roiColor = (_roi === null) ? "#848e9c" : (_roi >= 0 ? "#02c076" : "#cf304a");




          head.innerHTML =
  `<span style="pointer-events:none;">🔓 트레이더 ${m} 님 </span>` +
  `<span style="text-decoration:underline; color:#f3ba2f; font-weight:900;">(인증 해제)</span>` +
  (hasAny
    ? ` <span class="tg-stats" style="font-weight:900; display:block; margin-top:6px;">
          <div style="color:${eqColor};">[총자산 ${eqTxt || "-"}]</div>
          <div style="color:${roiColor};">[순이익률 ${roiTxt || "-"}]</div>
          ${hasAct 
            ? `<div style="color:#d1d4dc;">[활동지수 ${actTxt}점, ${gradeTxt}]</div>`
                : `<div style="color:#848e9c;">[활동지수 평가 중..]</div>`
              }
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
  window.TG_COMMON.setAuthActivity = setAuthActivity; // ✅ 추가
})();
