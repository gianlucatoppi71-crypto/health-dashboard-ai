/* ============================================================
   CAMERA SETUP — AUTO OPEN
============================================================ */
const video = document.getElementById("cameraFeed");
const captureBtn = document.getElementById("captureBtn");
const barcodeBtn = document.getElementById("barcodeBtn");
const loadingBox = document.getElementById("loadingBox");
const scanAgainBtn = document.getElementById("scanAgainBtn");
const resultSection = document.getElementById("resultSection");

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    video.srcObject = stream;
  } catch (err) {
    alert("Camera access blocked. Please enable camera permissions.");
  }
}

startCamera();

/* ============================================================
   CAPTURE IMAGE (FOOD AI)
============================================================ */
captureBtn.addEventListener("click", () => {
  if (!video.videoWidth || !video.videoHeight) {
    alert("Camera not ready yet. Please wait a moment.");
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);

  const imageDataURL = canvas.toDataURL("image/jpeg");
  processImage(imageDataURL);
});

/* ============================================================
   LOAD TENSORFLOW MODEL (FOOD AI)
============================================================ */
let model;
async function loadModel() {
  try {
    model = await tf.loadGraphModel(
      "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v2_1.0_224/model.json"
    );
  } catch (e) {
    console.error("Error loading model", e);
  }
}
loadModel();

/* ============================================================
   PROCESS IMAGE — AI FOOD RECOGNITION
============================================================ */
async function processImage(imageDataURL) {
  resultSection.classList.remove("hidden");
  loadingBox.classList.remove("hidden");
  loadingBox.innerText = "Analyzing food image…";

  const img = new Image();
  img.src = imageDataURL;

  img.onload = async () => {
    try {
      const tensor = tf.browser.fromPixels(img)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .expandDims();

      if (!model) {
        loadingBox.innerText = "AI model not ready yet.";
        return;
      }

      const prediction = await model.predict(tensor).data();
      const topIndex = prediction.indexOf(Math.max(...prediction));

      const foodName = FOOD_LABELS[topIndex] || "Unknown Food";
      const confidence = Math.max(...prediction) * 100;

      document.getElementById("foodName").innerText = foodName;
      document.getElementById("foodConfidence").innerText =
        "Confidence: " + confidence.toFixed(1) + "%";

      const nutrition =
        FOOD_NUTRITION_DB[foodName.toLowerCase()] || null;

      if (nutrition) {
        renderNutrition(nutrition);
        renderVerdict(nutrition);
        renderAlternative(nutrition);
        updateWeeklyCalories(nutrition.calories);
      } else {
        document.getElementById("nutritionCard").innerHTML =
          "<p>No nutrition data available for this food.</p>";
      }

      loadingBox.classList.add("hidden");
      scanAgainBtn.classList.remove("hidden");
    } catch (e) {
      console.error(e);
      loadingBox.innerText = "Error analyzing image.";
    }
  };
}

/* ============================================================
   BARCODE SCANNING (QUAGGA + OPENFOODFACTS)
============================================================ */
let quaggaRunning = false;

barcodeBtn.addEventListener("click", () => {
  if (quaggaRunning) return;
  startBarcodeScanner();
});

scanAgainBtn.addEventListener("click", () => {
  location.reload();
});

function startBarcodeScanner() {
  loadingBox.classList.remove("hidden");
  loadingBox.innerText = "Point the camera at the barcode…";
  resultSection.classList.remove("hidden");

  Quagga.init(
    {
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: video,
        constraints: {
          facingMode: "environment"
        }
      },
      decoder: {
        readers: ["ean_reader", "ean_8_reader", "upc_reader"]
      }
    },
    err => {
      if (err) {
        console.error(err);
        alert("Barcode scanner error: " + err);
        loadingBox.classList.add("hidden");
        return;
      }
      Quagga.start();
      quaggaRunning = true;
    }
  );

  Quagga.onDetected(async data => {
    if (!data || !data.codeResult || !data.codeResult.code) return;

    const code = data.codeResult.code;
    loadingBox.innerText = "Barcode detected: " + code;

    Quagga.stop();
    quaggaRunning = false;

    await fetchOpenFoodFacts(code);
  });
}

/* ============================================================
   OPENFOODFACTS LOOKUP
============================================================ */
async function fetchOpenFoodFacts(barcode) {
  loadingBox.innerText = "Fetching nutrition…";

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    const json = await res.json();

    if (!json.product) {
      loadingBox.innerText = "Product not found.";
      return;
    }

    const p = json.product.nutriments || {};

    const nutrition = {
      calories: p["energy-kcal_100g"] || 0,
      fat: p.fat_100g || 0,
      satFat: p["saturated-fat_100g"] || 0,
      carbs: p.carbohydrates_100g || 0,
      sugar: p.sugars_100g || 0,
      protein: p.proteins_100g || 0,
      sodium: (p.sodium_100g || 0) * 1000
    };

    document.getElementById("foodName").innerText =
      json.product.product_name || "Unknown Product";
    document.getElementById("foodConfidence").innerText =
      "Barcode: " + barcode;

    renderNutrition(nutrition);
    renderVerdict(nutrition);
    renderAlternative(nutrition);
    updateWeeklyCalories(nutrition.calories);

    loadingBox.classList.add("hidden");
    scanAgainBtn.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    loadingBox.innerText = "Error fetching product.";
  }
}

/* ============================================================
   NUTRITION CARD RENDER
============================================================ */
function renderNutrition(n) {
  document.getElementById("nutritionCard").innerHTML = `
    <p><strong>Calories:</strong> ${n.calories}</p>
    <p><strong>Fat:</strong> ${n.fat} g</p>
    <p><strong>Saturated Fat:</strong> ${n.satFat} g</p>
    <p><strong>Carbs:</strong> ${n.carbs} g</p>
    <p><strong>Sugar:</strong> ${n.sugar} g</p>
    <p><strong>Protein:</strong> ${n.protein} g</p>
    <p><strong>Sodium:</strong> ${n.sodium} mg</p>
  `;
}

/* ============================================================
   HEALTH VERDICT (Cholesterol + BP)
============================================================ */
function renderVerdict(n) {
  let verdict = "";
  let healthy = true;

  if (n.satFat > 5) {
    verdict += "⚠️ High saturated fat — not ideal for cholesterol.<br>";
    healthy = false;
  } else if (n.satFat > 2) {
    verdict += "⚠️ Moderate saturated fat — caution.<br>";
  } else {
    verdict += "👍 Good for cholesterol.<br>";
  }

  if (n.sodium > 800) {
    verdict += "⚠️ High sodium — not ideal for blood pressure.";
    healthy = false;
  } else if (n.sodium > 400) {
    verdict += "⚠️ Moderate sodium — caution.";
  } else {
    verdict += "👍 Good for blood pressure.";
  }

  document.getElementById("verdictText").innerHTML = verdict;

  const spoken = verdict.replace(/<br>/g, ". ");
  if (typeof speak === "function") {
    speak(spoken);
  }

  if (healthy) {
    document.getElementById("plantPointBox").classList.remove("hidden");
    addPlantPoint();
  } else {
    document.getElementById("plantPointBox").classList.add("hidden");
  }
}

/* ============================================================
   ALTERNATIVE SUGGESTIONS
============================================================ */
function renderAlternative(n) {
  let alt = "";

  if (n.sodium > 800) {
    alt = "Try low-sodium options like beans, lentils, or fresh chicken.";
  } else if (n.satFat > 5) {
    alt = "Try low-fat yogurt, cottage cheese, or lean meats.";
  } else if (n.sugar > 20) {
    alt = "Try fruit, yogurt, or nuts instead.";
  } else {
    alt = "This is already a healthy choice!";
  }

  document.getElementById("alternativeText").innerText = alt;
}

/* ============================================================
   PLANT POINTS
============================================================ */
function addPlantPoint() {
  let points = Number(localStorage.getItem("plantPoints") || 0);
  points++;
  localStorage.setItem("plantPoints", points);
}

/* ============================================================
   WEEKLY CALORIES TRACKER
============================================================ */
let weeklyData =
  JSON.parse(localStorage.getItem("weeklyCalories")) || {
    days: [0, 0, 0, 0, 0, 0, 0]
  };

function updateWeeklyCalories(calories) {
  const today = new Date().getDay();
  weeklyData.days[today] += calories;
  localStorage.setItem("weeklyCalories", JSON.stringify(weeklyData));
  updateChart();
}

/* ============================================================
   CALORIE GOAL
============================================================ */
const goalInput = document.getElementById("calorieGoalInput");
const savedGoal = localStorage.getItem("calorieGoal");
if (savedGoal) goalInput.value = savedGoal;

document.getElementById("saveGoalBtn").addEventListener("click", () => {
  const goal = Number(goalInput.value);
  localStorage.setItem("calorieGoal", goal);
  alert("Calorie goal saved!");
});

/* ============================================================
   WEEKLY CHART (Chart.js)
============================================================ */
let chart;

function updateChart() {
  const ctx = document.getElementById("weeklyChart").getContext("2d");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      datasets: [
        {
          label: "Calories",
          data: weeklyData.days,
          borderColor: "#0078ff",
          backgroundColor: "rgba(0,120,255,0.2)",
          borderWidth: 3,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

updateChart();

/* ============================================================
   FOOD LABELS + SIMPLE NUTRITION DB
============================================================ */
const FOOD_LABELS = [
  "apple",
  "banana",
  "bread",
  "cheese",
  "chicken",
  "pasta",
  "salad",
  "yogurt"
];

const FOOD_NUTRITION_DB = {
  "apple": {
    calories: 95,
    fat: 0.3,
    satFat: 0,
    carbs: 25,
    sugar: 19,
    protein: 0.5,
    sodium: 2
  },
  "banana": {
    calories: 105,
    fat: 0.4,
    satFat: 0.1,
    carbs: 27,
    sugar: 14,
    protein: 1.3,
    sodium: 1
  },
  "bread": {
    calories: 80,
    fat: 1,
    satFat: 0.2,
    carbs: 15,
    sugar: 2,
    protein: 3,
    sodium: 150
  },
  "cheese": {
    calories: 113,
    fat: 9,
    satFat: 6,
    carbs: 1,
    sugar: 0,
    protein: 7,
    sodium: 180
  },
  "chicken": {
    calories: 165,
    fat: 3.6,
    satFat: 1,
    carbs: 0,
    sugar: 0,
    protein: 31,
    sodium: 75
  },
  "pasta": {
    calories: 200,
    fat: 1.2,
    satFat: 0.2,
    carbs: 42,
    sugar: 2,
    protein: 7,
    sodium: 1
  },
  "salad": {
    calories: 33,
    fat: 0.4,
    satFat: 0.1,
    carbs: 6,
    sugar: 2,
    protein: 2,
    sodium: 20
  },
  "yogurt": {
    calories: 59,
    fat: 0.4,
    satFat: 0.2,
    carbs: 3.6,
    sugar: 3.2,
    protein: 10,
    sodium: 36
  }
};
