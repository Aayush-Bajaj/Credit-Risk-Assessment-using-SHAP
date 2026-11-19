
const form = document.getElementById("form");
const btn = document.getElementById("go");

const $ = (id) => document.getElementById(id);
const f = (name) => form.elements[name];

// FastAPI backend URL
const API_URL = "/predict";

// Auto-calculate loan percentage of income
function calcPercent() {
  const amt = parseFloat(f("loan_amnt").value);
  const inc = parseFloat(f("person_income").value);

  f("loan_percent_income").value =
    amt > 0 && inc > 0 ? (amt / inc).toFixed(2) : "";
}

["loan_amnt", "person_income"].forEach((name) => {
  f(name).addEventListener("input", calcPercent);
});

// Sample data
$("sample").addEventListener("click", () => {
  const sample = {
    person_age: 25,
    person_income: 59000,
    person_home_ownership: "RENT",
    person_emp_length: 4,
    loan_intent: "PERSONAL",
    loan_grade: "D",
    loan_amnt: 35000,
    loan_int_rate: 16.02,
    cb_person_default_on_file: "Y",
    cb_person_cred_hist_length: 3
  };

  Object.entries(sample).forEach(([key, value]) => {
    f(key).value = value;
  });

  calcPercent();
});

// Count-up animation
function countUp(el, to, ms = 1400) {
  const start = performance.now();

  function step(time) {
    const progress = Math.min((time - start) / ms, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    el.textContent = (to * eased).toFixed(1) + "%";

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

// Display prediction result
function showResult(result) {
  const probability = result.default_probability * 100;
  const highRisk = result.default_prediction === 1;

  const ring = $("ring");

  ring.classList.toggle("high", highRisk);

  ring.setAttribute("stroke-dasharray", "0 100");

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ring.setAttribute(
        "stroke-dasharray",
        `${probability} 100`
      );
    });
  });

  $("tick").setAttribute(
    "transform",
    `rotate(${result.threshold * 360} 100 100)`
  );

  $("tick").classList.add("on");

  countUp($("pct"), probability);

  const badge = $("badge");

  badge.className = "badge " + (highRisk ? "high" : "low");

  badge.textContent =
    (highRisk ? "⚠ " : "✓ ") + result.Result;

  $("msg").innerHTML = highRisk
    ? `This applicant is <b>likely to default</b>. The risk is above the decision threshold (the white mark on the ring).`
    : `This applicant is <b>unlikely to default</b>. The risk is below the decision threshold (the white mark on the ring).`;

  $("thr").textContent =
    (result.threshold * 100).toFixed(1) + "%";

  $("dec").textContent = highRisk ? "Reject" : "Approve";
}

// Display errors
function showError(message) {
  const badge = $("badge");

  badge.className = "badge high";
  badge.textContent = "Error";

  $("msg").textContent = message;
}

// Form submission
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  calcPercent();

  const data = {};

  for (const el of form.elements) {
    if (!el.name) continue;

    data[el.name] =
      el.type === "number" ? Number(el.value) : el.value;
  }

  // Loading state
  btn.disabled = true;
  btn.classList.add("loading");
  btn.querySelector("span").textContent = "Analyzing...";

  try {
    // Send request to FastAPI
    const response = await fetch(API_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(data)
    });

    const result = await response.json();

    // Handle API errors
    if (!response.ok) {
      throw new Error(
        result.detail || `Server error: ${response.status}`
      );
    }

    // Display prediction
    showResult(result);

  } catch (error) {
    console.error("Prediction error:", error);

    showError(
      "Could not get a prediction: " + error.message
    );

  } finally {
    // Reset button
    btn.disabled = false;
    btn.classList.remove("loading");
    btn.querySelector("span").textContent = "Analyze risk";
  }
});
