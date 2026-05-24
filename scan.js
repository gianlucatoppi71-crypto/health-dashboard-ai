/* ============================================================
   GLOBAL ELEMENTS
============================================================ */
const video = document.getElementById("cameraFeed");
const captureBtn = document.getElementById("captureBtn");
const barcodeBtn = document.getElementById("barcodeBtn");
const resultSection = document.getElementById("resultSection");
const loadingBox = document.getElementById("loadingBox");
const scanAgainBtn = document.getElementById("scanAgainBtn");

/* ============================================================
   START CAMERA
============================================================ */
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    video.srcObject = stream;
  } catch (err) {
    console.error("Camera error:", err);
  }
}

startCamera();

/* ============================================================
   LOAD MOBILENET MODEL (FREE + WORKING ON VERCEL)
============================================================ */
let model;

async function loadModel() {
  model = await tf.loadGraphModel(
    "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v2_1.0_224/model.json"
  );
  console.log("Model loaded!");
}

loadModel();

/* ============================================================
   LOAD IMAGENET LABELS (FREE)
============================================================ */
let imagenetLabels = [];

async function loadLabels() {
  try {
    const res = await fetch(
      "https://storage.googleapis.com/download.tensorflow.org/data/imagenet_class_names.json"
    );
    imagenetLabels = await res.json();
    console.log("Labels loaded!");
  } catch (e) {
    console.error("Error loading labels", e);
  }
}

loadLabels();

/* ============================================================
   YOUR FREE NUTRITION DATABASE
============================================================ */
const FOOD_NUTRITION_DB = {
  apple: { calories: 95, fat: 0.3, sugar: 19, protein: 0.5 },
  banana: { calories: 105, fat: 0.4, sugar: 14, protein: 1.3 },
  pasta: { calories: 221, fat: 1.3, sugar: 2.5, protein: 8 },
  salad: { calories: 33, fat: 0.2, sugar: 2, protein: 2 },
  yogurt: { calories: 59, fat: 0.4, sugar: 7, protein: 10 },
  bread: { calories: 79, fat: 1, sugar: 1.4, protein: 3.5 },
  cheese: { calories: 113, fat: 9.3, sugar: 0.2, protein: 7 },
  chicken: { calories: 165, fat: 3.6, sugar: 0, protein: 31 }
};

/* ============================================================
   CAPTURE IMAGE FROM CAMERA
============================================================ */
captureBtn.addEventListener("click", () => {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);

  const imageDataURL = canvas.toDataURL("image/jpeg");
  processImage(imageDataURL);
});

/* ============================================================
   PROCESS IMAGE WITH FREE AI MODEL
============================================================ */
async function processImage(imageDataURL) {
  resultSection.classList.remove("hidden");
  loadingBox.classList.remove("hidden");
  loadingBox.innerText = "Analyzing food image…";

  const img = new Image();
  img.src = imageDataURL;

  img.onload = async () => {
    try {
      if (!model || !imagenetLabels.length) {
        loadingBox.innerText = "AI model not ready yet.";
        return;
      }

      const tensor = tf.browser.fromPixels(img)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .div(255.0)
        .expandDims();

      const prediction = await model.predict(tensor).data();
      const topIndex = prediction.indexOf(Math.max(...prediction));

      const rawLabel = imagenetLabels[topIndex] || "Unknown";
      const confidence = Math.max(...prediction) * 100;

      document.getElementById("foodName").innerText = rawLabel;
      document.getElementById("foodConfidence").innerText =
        "Confidence: " + confidence.toFixed(1) + "%";

      // Try to match to your nutrition DB
      const lower = rawLabel.toLowerCase();
      let matchedKey = null;

      for (const key of Object.keys(FOOD_NUTRITION_DB)) {
        if (lower.includes(key)) {
          matchedKey = key;
          break;
        }
      }

      if (matchedKey) {
        const nutrition = FOOD_NUTRITION_DB[matchedKey];
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
   BARCODE SCANNING (FREE)
============================================================ */
barcodeBtn.addEventListener("click", () => {
  loadingBox.classList.remove("hidden");
  loadingBox.innerText = "Scanning barcode…";

  Quagga.init(
    {
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: video
      },
      decoder: {
        readers: ["ean_reader", "ean_8_reader", "code_128_reader"]
      }
    },
    function (err) {
      if (err) {
        console.error(err);
        loadingBox.innerText = "Barcode scanner error.";
        return;
      }
      Quagga.start();
    }
  );

  Quagga.onDetected(async function (data) {
    const code = data.codeResult.code;
    Quagga.stop();

    loadingBox.innerText = "Barcode detected: " + code;

    fetchOpenFoodFacts(code);
  });
});

/* ============================================================
   OPENFOODFACTS (FREE BARCODE NUTRITION)
============================================================ */
async function fetchOpenFoodFacts(code) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${code}.json`
    );
    const data = await res.json();

    if (!data.product) {
      document.getElementById("nutritionCard").innerHTML =
        "<p>No product found.</p>";
      return;
    }

    const product = data.product;

    document.getElementById("foodName").innerText = product.product_name || "Unknown Product";

    document.getElementById("nutritionCard").innerHTML = `
      <p>Calories: ${product.nutriments["energy-kcal"] || "?"}</p>
      <p>Sugar: ${product.nutriments.sugars || "?"} g</p>
      <p>Fat: ${product.nutriments.fat || "?"} g</p>
      <p>Protein: ${product.nutriments.proteins || "?"} g</p>
    `;

    loadingBox.classList.add("hidden");
  } catch (err) {
    console.error(err);
    loadingBox.innerText = "Error loading product.";
  }
}

/* ============================================================
   RENDER FUNCTIONS
============================================================ */
function renderNutrition(n) {
  document.getElementById("nutritionCard").innerHTML = `
    <p>Calories: ${n.calories}</p>
    <p>Fat: ${n.fat} g</p>
    <p>Sugar: ${n.sugar} g</p>
    <p>Protein: ${n.protein} g</p>
  `;
}

function renderVerdict(n) {
  let verdict = "Balanced choice.";

  if (n.sugar > 15) verdict = "High sugar — eat in moderation.";
  if (n.fat > 10) verdict = "High fat — be careful.";

  document.getElementById("verdictText").innerText = verdict;
}

function renderAlternative(n) {
  document.getElementById("alternativeText").innerText =
    "Try a lower‑sugar or lower‑fat option.";
}

function updateWeeklyCalories(cal) {
  console.log("Calories added:", cal);
}

/* ============================================================
   SCAN AGAIN
============================================================ */
scanAgainBtn.addEventListener("click", () => {
  resultSection.classList.add("hidden");
  scanAgainBtn.classList.add("hidden");
  loadingBox.classList.add("hidden");
});
