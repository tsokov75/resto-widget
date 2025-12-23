(() => {
  "use strict";

  // Фиксиран курс: 1 EUR = 1.95583 BGN
  const RATE = 1.95583;

  const $ = (id) => document.getElementById(id);

  // elements
  const dueEl = $("due");
  const paidEl = $("paid");

  const btnBGN = $("btnBGN");
  const btnEUR = $("btnEUR");
  const paidCurEl = $("paidCur");

  const calcBtn = $("calc");
  const outBGN = $("outBGN");
  const outEUR = $("outEUR");
  const warnEl = $("warn");

  const showDetails = $("showDetails");
  const detailsWrap = $("detailsWrap");
  const detBGN = $("detBGN");
  const detEUR = $("detEUR");

  const quickBtns = $("quickBtns");
  const btnPaidClear = $("btnPaidClear");

  const minBtn = $("minBtn");
  const content = $("content");
  const minimized = $("minimized");
  const openBtn = $("openBtn");

  // state
  let payCurrency = "BGN"; // BGN | EUR

  // Helpers
  function parseMoney(str) {
    if (!str) return NaN;
    const cleaned = String(str).trim().replace(/\s+/g, "").replace(",", ".");
    const v = Number(cleaned);
    return Number.isFinite(v) ? v : NaN;
  }
  function toCents(amount) { return Math.round(amount * 100); }
  function centsToMoney(cents) { return cents / 100; }

  function fmt(n, cur) {
    if (!Number.isFinite(n)) return "–";
    const s = n.toFixed(2);
    return cur === "BGN" ? `${s} лв` : `${s} €`;
  }

  // Denoms in cents
  const BGN_DENOMS = [
    { label:"100 лв", v:10000 }, { label:"50 лв", v:5000 }, { label:"20 лв", v:2000 },
    { label:"10 лв", v:1000 }, { label:"5 лв", v:500 }, { label:"2 лв", v:200 },
    { label:"1 лв", v:100 }, { label:"50 ст", v:50 }, { label:"20 ст", v:20 },
    { label:"10 ст", v:10 }, { label:"5 ст", v:5 }, { label:"2 ст", v:2 }, { label:"1 ст", v:1 }
  ];
  const EUR_DENOMS = [
    { label:"500 €", v:50000 }, { label:"200 €", v:20000 }, { label:"100 €", v:10000 },
    { label:"50 €", v:5000 }, { label:"20 €", v:2000 }, { label:"10 €", v:1000 },
    { label:"5 €", v:500 }, { label:"2 €", v:200 }, { label:"1 €", v:100 },
    { label:"50 c", v:50 }, { label:"20 c", v:20 }, { label:"10 c", v:10 }, { label:"5 c", v:5 },
    { label:"2 c", v:2 }, { label:"1 c", v:1 }
  ];

  function greedyBreakdown(cents, denoms) {
    let rem = cents;
    const out = [];
    for (const d of denoms) {
      if (rem <= 0) break;
      const c = Math.floor(rem / d.v);
      if (c > 0) {
        out.push({ label: d.label, count: c });
        rem -= c * d.v;
      }
    }
    return out;
  }

  function renderBreakdown(list, target) {
    if (!list.length) { target.innerHTML = "–"; return; }
    target.innerHTML = list.map(x => `<div class="rowitem"><span>${x.label}</span><b>x ${x.count}</b></div>`).join("");
  }

  // Quick buttons (common cash)
  const QUICK = {
    BGN: [1,2,5,10,20,50,100,200],
    EUR: [1,2,5,10,20,50,100,200]
  };

  function renderQuickButtons() {
    quickBtns.innerHTML = "";
    const vals = QUICK[payCurrency];
    for (const v of vals) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = payCurrency === "BGN" ? `${v} лв` : `${v} €`;
      b.addEventListener("click", () => addPaid(v));
      quickBtns.appendChild(b);
    }
  }

  function addPaid(amount) {
    const cur = parseMoney(paidEl.value);
    const next = (Number.isFinite(cur) ? cur : 0) + amount;
    paidEl.value = next.toFixed(2).replace(/\.00$/, ""); // ако е цяло, махни .00
    paidEl.focus();
  }

  function setCurrency(cur) {
    payCurrency = cur;
    btnBGN.classList.toggle("active", cur === "BGN");
    btnEUR.classList.toggle("active", cur === "EUR");
    btnBGN.setAttribute("aria-selected", cur === "BGN" ? "true" : "false");
    btnEUR.setAttribute("aria-selected", cur === "EUR" ? "true" : "false");
    paidCurEl.textContent = cur;
    paidEl.placeholder = cur === "BGN" ? "100" : "50";
    renderQuickButtons();
  }

  function showWarn(msg) {
    warnEl.hidden = !msg;
    warnEl.textContent = msg || "";
  }

  function calc() {
    showWarn("");

    const dueBgn = parseMoney(dueEl.value);
    const paid = parseMoney(paidEl.value);

    if (!Number.isFinite(dueBgn) || dueBgn < 0) {
      showWarn("Моля, въведи валидна сума за плащане (BGN).");
      outBGN.textContent = "–"; outEUR.textContent = "–";
      detBGN.innerHTML = "–"; detEUR.innerHTML = "–";
      return;
    }
    if (!Number.isFinite(paid) || paid < 0) {
      showWarn(`Моля, въведи валидна подадена сума (${payCurrency}).`);
      outBGN.textContent = "–"; outEUR.textContent = "–";
      detBGN.innerHTML = "–"; detEUR.innerHTML = "–";
      return;
    }

    const dueBgnC = toCents(dueBgn);

    // Convert paid -> BGN cents
    let paidBgnC = 0;
    if (payCurrency === "BGN") {
      paidBgnC = toCents(paid);
    } else {
      paidBgnC = toCents(paid * RATE);
    }

    const changeBgnC = paidBgnC - dueBgnC;

    if (changeBgnC < 0) {
      const missingBgn = centsToMoney(-changeBgnC);
      const missingEur = missingBgn / RATE;
      outBGN.textContent = `Липсват ${fmt(missingBgn, "BGN")}`;
      outEUR.textContent = `Липсват ${fmt(missingEur, "EUR")}`;
      detBGN.innerHTML = "–";
      detEUR.innerHTML = "–";
      return;
    }

    const changeBgn = centsToMoney(changeBgnC);
    const changeEur = changeBgn / RATE;

    outBGN.textContent = fmt(changeBgn, "BGN");
    outEUR.textContent = fmt(changeEur, "EUR");

    if (showDetails.checked) {
      detailsWrap.style.display = "flex";
      const bgnList = greedyBreakdown(changeBgnC, BGN_DENOMS);
      const eurCents = toCents(changeEur);
      const eurList = greedyBreakdown(eurCents, EUR_DENOMS);
      renderBreakdown(bgnList, detBGN);
      renderBreakdown(eurList, detEUR);
    } else {
      detailsWrap.style.display = "none";
    }
  }

  function updateEta() {
    const target = new Date(2025, 11, 31, 23, 59, 59);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    $("eta-days").textContent = String(days);
  }

  // events
  btnBGN.addEventListener("click", () => setCurrency("BGN"));
  btnEUR.addEventListener("click", () => setCurrency("EUR"));
  calcBtn.addEventListener("click", calc);
  dueEl.addEventListener("keydown", (e) => { if (e.key === "Enter") calc(); });
  paidEl.addEventListener("keydown", (e) => { if (e.key === "Enter") calc(); });

  showDetails.addEventListener("change", () => {
    detailsWrap.style.display = showDetails.checked ? "flex" : "none";
  });

  btnPaidClear.addEventListener("click", () => {
    paidEl.value = "";
    paidEl.focus();
  });

  minBtn.addEventListener("click", () => {
    content.hidden = true;
    minimized.hidden = false;
  });
  openBtn.addEventListener("click", () => {
    minimized.hidden = true;
    content.hidden = false;
  });

  // init
  setCurrency("BGN");
  updateEta();
  setInterval(updateEta, 60 * 1000);
})();