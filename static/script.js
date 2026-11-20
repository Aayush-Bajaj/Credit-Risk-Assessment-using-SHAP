const form = document.getElementById("form");
const btn = document.getElementById("go");
const $ = (id) => document.getElementById(id);
const f = (name) => form.elements[name];

// FastAPI backend endpoint
const API_URL = "/predict";

// Auto-calculate loan % of income
function calcPercent() {
  const amt = parseFloat(f("loan_amnt").value);
  const inc = parseFloat(f("person_income").value);
  f("loan_percent_income").value = amt > 0 && inc > 0 ? (amt / inc).toFixed(2) : "";
}
["loan_amnt", "person_income"].forEach((n) => f(n).addEventListener("input", calcPercent));

// Sample data
$("sample").addEventListener("click", () => {
  const sample = {
    person_age: 25, person_income: 59000, person_home_ownership: "RENT",
    person_emp_length: 4, loan_intent: "PERSONAL", loan_grade: "D",
    loan_amnt: 35000, loan_int_rate: 16.02,
    cb_person_default_on_file: "Y", cb_person_cred_hist_length: 3,
  };
  Object.entries(sample).forEach(([k, v]) => (f(k).value = v));
  calcPercent();
});

// Count-up animation
function countUp(el, to, ms = 1400) {
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min((t - t0) / ms, 1);
    el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(1) + "%";
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Show prediction
function showResult(r) {
  const prob = r.default_probability * 100;
  const high = r.default_prediction === 1;
  const ring = $("ring");

  ring.classList.remove("low", "high");
  ring.classList.add(high ? "high" : "low");
  ring.setAttribute("stroke-dasharray", "0 100");
  requestAnimationFrame(() => requestAnimationFrame(() =>
    ring.setAttribute("stroke-dasharray", `${prob} 100`)));

  $("tick").setAttribute("transform", `rotate(${r.threshold * 360} 100 100)`);
  $("tick").classList.add("on");
  countUp($("pct"), prob);

  const badge = $("badge");
  badge.className = "badge " + (high ? "high" : "low");
  badge.textContent = (high ? "⚠ " : "✓ ") + r.Result;

  $("msg").innerHTML = high
    ? `This applicant is <b>likely to default</b>. The risk is above the decision threshold (the white mark on the ring).`
    : `This applicant is <b>unlikely to default</b>. The risk is below the decision threshold (the white mark on the ring).`;
  $("thr").textContent = (r.threshold * 100).toFixed(1) + "%";
  $("dec").textContent = high ? "Reject" : "Approve";
}

function showError(message) {
  $("badge").className = "badge high";
  $("badge").textContent = "Error";
  $("msg").textContent = message;
}

// Submit
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
  btn.querySelector("span").textContent = "Analyzing...";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(typeof result.detail === "string" ? result.detail : `Server error: ${res.status}`);
    showResult(result);
  } catch (err) {
    console.error("Prediction error:", err);
    showError("Could not get a prediction: " + err.message);
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
    btn.querySelector("span").textContent = "Analyze risk";
    if (innerWidth < 900) setTimeout(() => $("result").scrollIntoView({ behavior: "smooth", block: "center" }), 500);
  }
});

// ---- Site effects ----
const nav = $("nav");
addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 20), { passive: true });

// Scroll reveal + stat counters
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add("in");
    const c = en.target.querySelector("[data-count]");
    if (c) {
      const to = +c.dataset.count, t0 = performance.now();
      const tick = (t) => {
        const p = Math.min((t - t0) / 1500, 1);
        c.textContent = (c.dataset.pre || "") + Math.round(to * (1 - Math.pow(1 - p, 3))) + (c.dataset.suf || "");
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    io.unobserve(en.target);
  });
}, { threshold: 0.12 });
document.querySelectorAll(".rv").forEach((el) => io.observe(el));

// Cursor spotlight on cards
document.querySelectorAll(".fcard, .card").forEach((el) => {
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", e.clientX - r.left + "px");
    el.style.setProperty("--my", e.clientY - r.top + "px");
  });
});