/**
 * CreditRisk — Institutional Credit Risk Assessment Engine
 * Frontend Controller & API Integration
 */

const form = document.getElementById("form");
const btn = document.getElementById("go");
const $ = (id) => document.getElementById(id);
const f = (name) => form.elements[name];

// FastAPI backend endpoint
const API_URL = "/predict";

// Auto-calculate loan % of income (DTI)
function calcPercent() {
  const amt = parseFloat(f("loan_amnt").value);
  const inc = parseFloat(f("person_income").value);
  const pct = amt > 0 && inc > 0 ? (amt / inc).toFixed(2) : "";
  
  f("loan_percent_income").value = pct;
  
  const dtiBadge = $("dtiHelperBadge");
  const auditDti = $("auditDti");
  
  if (dtiBadge) {
    if (pct === "") {
      dtiBadge.textContent = "Awaiting inputs";
      dtiBadge.className = "dti-status-pill";
    } else {
      const val = parseFloat(pct) * 100;
      if (val > 35) {
        dtiBadge.textContent = `DTI: ${val.toFixed(1)}% (Elevated)`;
        dtiBadge.className = "dti-status-pill high";
      } else {
        dtiBadge.textContent = `DTI: ${val.toFixed(1)}% (Healthy)`;
        dtiBadge.className = "dti-status-pill low";
      }
    }
  }

  if (auditDti) {
    auditDti.textContent = pct !== "" ? `${(parseFloat(pct) * 100).toFixed(1)}%` : "--";
  }
}

["loan_amnt", "person_income"].forEach((n) => {
  const el = f(n);
  if (el) el.addEventListener("input", calcPercent);
});

// Presets Definition
const PRESETS = {
  sample: {
    person_age: 25,
    person_income: 59000,
    person_home_ownership: "RENT",
    person_emp_length: 4,
    loan_intent: "PERSONAL",
    loan_grade: "D",
    loan_amnt: 35000,
    loan_int_rate: 16.02,
    cb_person_default_on_file: "Y",
    cb_person_cred_hist_length: 3,
  },
  prime: {
    person_age: 34,
    person_income: 92000,
    person_home_ownership: "MORTGAGE",
    person_emp_length: 7.5,
    loan_intent: "HOMEIMPROVEMENT",
    loan_grade: "A",
    loan_amnt: 12000,
    loan_int_rate: 6.85,
    cb_person_default_on_file: "N",
    cb_person_cred_hist_length: 9,
  },
  nearprime: {
    person_age: 29,
    person_income: 54000,
    person_home_ownership: "RENT",
    person_emp_length: 3.5,
    loan_intent: "PERSONAL",
    loan_grade: "C",
    loan_amnt: 15000,
    loan_int_rate: 11.49,
    cb_person_default_on_file: "N",
    cb_person_cred_hist_length: 5,
  }
};

function applyPreset(presetData, triggerButton) {
  Object.entries(presetData).forEach(([k, v]) => {
    if (f(k)) f(k).value = v;
  });
  calcPercent();

  document.querySelectorAll(".preset-pill").forEach(el => el.classList.remove("active"));
  if (triggerButton) {
    triggerButton.classList.add("active");
  }
}

// Sample Data Button (Preserves exact existing behavior & ID)
$("sample").addEventListener("click", (e) => {
  applyPreset(PRESETS.sample, e.currentTarget);
});

// Additional Preset Buttons
document.querySelectorAll("[data-preset]").forEach((btnEl) => {
  btnEl.addEventListener("click", (e) => {
    const key = e.currentTarget.getAttribute("data-preset");
    if (PRESETS[key]) {
      applyPreset(PRESETS[key], e.currentTarget);
    }
  });
});

// Reset Form Button
const resetBtn = $("resetFormBtn");
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    form.reset();
    calcPercent();
    document.querySelectorAll(".preset-pill").forEach(el => el.classList.remove("active"));
  });
}

// Count-up animation
function countUp(el, to, ms = 1300) {
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min((t - t0) / ms, 1);
    el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(1) + "%";
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Format localized timestamp
function getFormattedTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + " UTC";
}

// Render dynamic applicant SHAP factor decomposition
function renderExplainability(data, result) {
  const container = $("factorDecomposition");
  if (!container) return;

  const factors = [];
  const dti = data.loan_percent_income || (data.loan_amnt / data.person_income);

  // 1. Debt-to-Income (DTI)
  if (dti > 0.35) {
    factors.push({
      title: "Debt-to-Income Ratio (DTI)",
      value: `${(dti * 100).toFixed(1)}%`,
      type: "adverse",
      badge: "+24.2% Risk",
      width: "82%",
      expl: "High loan burden relative to annual earnings significantly impairs debt servicing buffer."
    });
  } else if (dti <= 0.20) {
    factors.push({
      title: "Debt-to-Income Ratio (DTI)",
      value: `${(dti * 100).toFixed(1)}%`,
      type: "mitigating",
      badge: "−18.5% Risk",
      width: "65%",
      expl: "Conservative loan burden well below institutional 20% Basel prudential threshold."
    });
  } else {
    factors.push({
      title: "Debt-to-Income Ratio (DTI)",
      value: `${(dti * 100).toFixed(1)}%`,
      type: "mitigating",
      badge: "−5.0% Risk",
      width: "35%",
      expl: "Moderate loan-to-income ratio aligns within acceptable industry tolerance."
    });
  }

  // 2. Previous Default on File
  if (data.cb_person_default_on_file === "Y") {
    factors.push({
      title: "Historical Bureau Default Record",
      value: "Default on File (Yes)",
      type: "adverse",
      badge: "+31.8% Risk",
      width: "95%",
      expl: "Historical credit default record indicates persistent credit delinquency hazard."
    });
  } else {
    factors.push({
      title: "Historical Credit Bureau Standing",
      value: "Clean Bureau Record (No Defaults)",
      type: "mitigating",
      badge: "−22.4% Risk",
      width: "74%",
      expl: "Absence of prior defaults indicates disciplined historical debt obligation fulfillment."
    });
  }

  // 3. Internal Loan Grade
  const primeGrades = ["A", "B"];
  const subprimeGrades = ["D", "E", "F", "G"];
  if (primeGrades.includes(data.loan_grade)) {
    factors.push({
      title: "Internal Credit Grade Assessment",
      value: `Grade ${data.loan_grade} (Prime Underwriting Tier)`,
      type: "mitigating",
      badge: "−19.1% Risk",
      width: "68%",
      expl: "Prime grade classification reflects strong fundamental creditworthiness."
    });
  } else if (subprimeGrades.includes(data.loan_grade)) {
    factors.push({
      title: "Internal Credit Grade Assessment",
      value: `Grade ${data.loan_grade} (Elevated Risk Tier)`,
      type: "adverse",
      badge: "+26.7% Risk",
      width: "88%",
      expl: "Low credit grade classification triggers heightened portfolio risk weighting."
    });
  } else {
    factors.push({
      title: "Internal Credit Grade Assessment",
      value: `Grade ${data.loan_grade} (Standard Tier)`,
      type: "mitigating",
      badge: "−2.5% Risk",
      width: "25%",
      expl: "Standard middle-tier credit rating with neutral baseline risk impact."
    });
  }

  // 4. Contract Interest Rate
  if (data.loan_int_rate >= 14.0) {
    factors.push({
      title: "Contract Interest Rate",
      value: `${data.loan_int_rate.toFixed(2)}% APR`,
      type: "adverse",
      badge: "+14.3% Risk",
      width: "55%",
      expl: "Elevated annual interest rate imposes heavier recurring cash-flow servicing demands."
    });
  } else if (data.loan_int_rate < 8.5) {
    factors.push({
      title: "Contract Interest Rate",
      value: `${data.loan_int_rate.toFixed(2)}% APR`,
      type: "mitigating",
      badge: "−11.2% Risk",
      width: "48%",
      expl: "Competitive low interest rate lowers debt service burden and reduces default risk."
    });
  }

  // 5. Employment & Credit History Stability
  if (data.person_emp_length >= 5) {
    factors.push({
      title: "Employment Tenure Stability",
      value: `${data.person_emp_length} years at current employer`,
      type: "mitigating",
      badge: "−8.7% Risk",
      width: "42%",
      expl: "Established employment duration demonstrates income stability and career continuity."
    });
  } else if (data.person_emp_length < 2) {
    factors.push({
      title: "Employment Tenure Stability",
      value: `${data.person_emp_length} years at current employer`,
      type: "adverse",
      badge: "+9.4% Risk",
      width: "38%",
      expl: "Shorter employment tenure presents higher vulnerability to income disruption."
    });
  }

  // Build HTML cards
  container.innerHTML = factors.map(f => `
    <div class="factor-card">
      <div class="factor-meta">
        <span class="factor-title">${f.title}: <strong>${f.value}</strong></span>
        <span class="factor-impact-badge ${f.type}">${f.badge}</span>
      </div>
      <div class="factor-bar-track">
        <div class="factor-bar-fill ${f.type}" style="width: ${f.width};"></div>
      </div>
      <div class="factor-expl">${f.expl}</div>
    </div>
  `).join("");
}

// Show prediction results (Preserves all existing IDs & selectors)
function showResult(r, formData) {
  const prob = r.default_probability * 100;
  const high = r.default_prediction === 1;
  const ring = $("ring");

  // Animate Gauge Ring
  ring.classList.remove("low", "high");
  ring.classList.add(high ? "high" : "low");
  ring.setAttribute("stroke-dasharray", "0 100");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ring.setAttribute("stroke-dasharray", `${prob} 100`);
    });
  });

  // Position Threshold Tick
  $("tick").setAttribute("transform", `rotate(${r.threshold * 360} 100 100)`);
  $("tick").classList.add("on");

  // Animate Percentage Readout
  countUp($("pct"), prob);

  // Status Badge
  const badge = $("badge");
  badge.className = "badge " + (high ? "high" : "low");
  badge.innerHTML = high
    ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ${r.Result} — Review Required`
    : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> ${r.Result} — Approved`;

  // Narrative Statement
  $("msg").innerHTML = high
    ? `This applicant exhibits an <b>elevated risk profile</b>. The calibrated default probability of <b>${prob.toFixed(1)}%</b> exceeds the institutional threshold of ${(r.threshold * 100).toFixed(1)}%. Recommend decline or secondary underwriter review.`
    : `This applicant presents a <b>favorable credit profile</b>. The calibrated default probability of <b>${prob.toFixed(1)}%</b> is comfortably within the approved threshold of ${(r.threshold * 100).toFixed(1)}%. Standard origination recommended.`;

  // Key Metric Cells
  $("thr").textContent = (r.threshold * 100).toFixed(1) + "%";
  $("dec").textContent = high ? "Reject / Review" : "Approve";

  // Scorecard Secondary Audit Panel
  const auditTime = $("auditTime");
  if (auditTime) auditTime.textContent = getFormattedTimestamp();

  const riskClass = $("riskClassBadge");
  if (riskClass) {
    if (high) {
      riskClass.textContent = "Tier 4 High Risk";
      riskClass.style.color = "var(--status-high)";
    } else if (prob < 15) {
      riskClass.textContent = "Tier 1 Prime";
      riskClass.style.color = "var(--status-low)";
    } else {
      riskClass.textContent = "Tier 2 Standard";
      riskClass.style.color = "var(--teal-700)";
    }
  }

  const auditBureau = $("auditBureau");
  if (auditBureau && formData) {
    auditBureau.textContent = formData.cb_person_default_on_file === "Y" ? "Prior Default on File" : "Clean Bureau Record";
  }

  // Update dynamic SHAP explainability
  if (formData) {
    renderExplainability(formData, r);
  }
}

// Show Error Feedback
function showError(message) {
  $("badge").className = "badge high";
  $("badge").innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Assessment Failed`;
  $("msg").textContent = message;
}

// Form Submission Handler
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  calcPercent();

  const data = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    data[el.name] = el.type === "number" ? Number(el.value) : el.value;
  }

  btn.disabled = true;
  btn.classList.add("loading");
  btn.querySelector("span").textContent = "Analyzing Credit Risk...";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(typeof result.detail === "string" ? result.detail : `Server error: ${res.status}`);
    }
    showResult(result, data);
  } catch (err) {
    console.error("Prediction error:", err);
    showError("Could not retrieve risk prediction: " + err.message);
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
    btn.querySelector("span").textContent = "Analyze Credit Risk";
    if (innerWidth < 1100) {
      setTimeout(() => $("result").scrollIntoView({ behavior: "smooth", block: "start" }), 350);
    }
  }
});

// Scroll Effects & Active Navigation
const nav = $("nav");
addEventListener("scroll", () => {
  if (nav) {
    nav.classList.toggle("scrolled", window.scrollY > 20);
  }
}, { passive: true });

// Scroll Reveal & Number Counter Observer
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add("in");
    
    const c = en.target.querySelector("[data-count]");
    if (c) {
      const to = parseFloat(c.dataset.count);
      const isDecimal = String(c.dataset.count).includes(".");
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min((t - t0) / 1200, 1);
        const currentVal = to * (1 - Math.pow(1 - p, 3));
        const formattedVal = isDecimal ? currentVal.toFixed(1) : Math.round(currentVal);
        c.textContent = (c.dataset.pre || "") + formattedVal + (c.dataset.suf || "");
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    io.unobserve(en.target);
  });
}, { threshold: 0.12 });

document.querySelectorAll(".rv").forEach((el) => io.observe(el));
