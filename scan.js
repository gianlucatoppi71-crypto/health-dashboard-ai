// ===== GLOBAL =====
const video = document.getElementById("cameraFeed");
const captureBtn = document.getElementById("captureBtn");
const barcodeBtn = document.getElementById("barcodeBtn");
const resultSection = document.getElementById("resultSection");
const loadingBox = document.getElementById("loadingBox");
const scanAgainBtn = document.getElementById("scanAgainBtn");

// ===== CAMERA =====
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    video.srcObject = stream;
  } catch (err) {
    console.error("Camera error:", err);
  }
}
startCamera();

// ===== MODEL (jsDelivr) =====
let model;
async function loadModel() {
  model = await tf.loadGraphModel(
    "https://cdn.jsdelivr.net/gh/tensorflow/tfjs-models@master/mobilenet_v2_1.0_224/model.json"
  );
  console.log("Model loaded");
}
loadModel();

// ===== LABELS (jsDelivr) =====
let imagenetLabels = [];
async function loadLabels() {
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/gh/tensorflow/tfjs-models@master/mobilenet_v2_1.0_224/imagenet_class_names.json"
    );
    imagenetLabels = await res.json();
    console.log("Labels loaded");
  } catch (e) {
    console.error("Label error", e);
  }
}
loadLabels();

// ===== NUTRITION DB =====
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

// ===== CAPTURE =====
captureBtn.addEventListener("click", () => {
  const c = document.createElement("canvas");
  c.width = video.videoWidth;
  c.height = video.videoHeight;
  c.getContext("2d").drawImage(video, 0, 0);
  processImage(c.toDataURL("image/jpeg"));
});

// ===== AI PROCESS =====
async function processImage(imageDataURL) {
  resultSection.classList.remove("hidden");
  loadingBox.classList.remove("hidden");
  loadingBox.innerText = "Analyzing…";

  const img = new Image();
  img.src = imageDataURL;

  img.onload = async () => {
    try {
      if (!model || !imagenetLabels.length) {
        loadingBox.innerText = "AI model not ready yet.";
        return;
      }

      const t = tf.browser.fromPixels(img)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .div(255)
        .expandDims();

      const pred = await model.predict(t).data();
      const top = pred.indexOf(Math.max(...pred));
      const label = imagenetLabels[top] || "Unknown";
      const conf = Math.max(...pred) * 100;

      document.getElementById("foodName").innerText = label;
      document.getElementById("foodConfidence").innerText =
        "Confidence: " + conf.toFixed(1) + "%";

      const key = Object.keys(FOOD_NUTRITION_DB).find(k =>
        label.toLowerCase().includes(k)
      );

      if (key) {
        const n = FOOD_NUTRITION_DB[key];
        renderNutrition(n);
        renderVerdict(n);
        renderAlternative(n);
      } else {
        document.getElementById("nutritionCard").innerHTML =
          "<p>No nutrition data available.</p>";
      }

      loadingBox.classList.add("hidden");
      scanAgainBtn.classList.remove("hidden");
    } catch (e) {
      console.error(e);
      loadingBox.innerText = "Error analyzing image.";
    }
  };
}

// ===== BARCODE =====
barcodeBtn.addEventListener("click", () => {
  loadingBox.classList.remove("hidden");
  loadingBox.innerText = "Scanning barcode…";

  Quagga.init(
    {
      inputStream: { name: "Live", type: "LiveStream", target: video },
      decoder: { readers: ["ean_reader", "ean_8_reader", "code_128_reader"] }
    },
    err => {
      if (err) {
        console.error(err);
        loadingBox.innerText = "Barcode error.";
        return;
      }
      Quagga.start();
    }
  );

  Quagga.onDetected(data => {
    Quagga.stop();
    loadingBox.innerText = "Barcode: " + data.codeResult.code;
    fetchOpenFoodFacts(data.codeResult.code);
  });
});

// ===== OPENFOODFACTS =====
async function fetchOpenFoodFacts(code) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${code}.json`
    );
    const d = await res.json();

    if (!d.product) {
      document.getElementById("nutritionCard").innerHTML =
        "<p>No product found.</p>";
      return;
    }

    const p = d.product;
    document.getElementById("foodName").innerText =
      p.product_name || "Unknown Product";

    document.getElementById("nutritionCard").innerHTML = `
      <p>Calories: ${p.nutriments["energy-kcal"] || "?"}</p>
      <p>Sugar: ${p.nutriments.sugars || "?"} g</p>
      <p>Fat: ${p.nutriments.fat || "?"} g</p>
      <p>Protein: ${p.nutriments.proteins || "?"} g</p>
    `;

    loadingBox.classList.add("hidden");
  } catch (e) {
    console.error(e);
    loadingBox.innerText = "Product error.";
  }
}

// ===== RENDER =====
function renderNutrition(n) {
  document.getElementById("nutritionCard").innerHTML = `
    <p>Calories: ${n.calories}</p>
    <p>Fat: ${n.fat} g</p>
    <p>Sugar: ${n.sugar} g</p>
    <p>Protein: ${n.protein} g</p>
  `;
}

function renderVerdict(n) {
  let v = "Balanced choice.";
  if (n.sugar > 15) v = "High sugar — moderation needed.";
  if (n.fat > 10) v = "High fat — be careful.";
  document.getElementById("verdictText").innerText = v;
}

function renderAlternative(n) {
  document.getElementById("alternativeText").innerText =
    "Try a lower‑sugar or lower‑fat option.";
}

// ===== SCAN AGAIN =====
scanAgainBtn.addEventListener("click", () => {
  resultSection.classList.add("hidden");
  scanAgainBtn.classList.add("hidden");
  loadingBox.classList.add("hidden");
});
