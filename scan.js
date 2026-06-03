/* ===============================
   FOOD CLASS LIST
=============================== */
const CLASS_TO_NAME = {
  0: "Apple",
  1: "Asparagus",
  2: "Avocado",
  3: "Bacon",
  4: "Baked Beans",
  5: "Banana",
  6: "Banana Slice",
  7: "Basil",
  8: "Beef Steak",
  9: "Black Grapes",
  10: "Blackberries",
  11: "Blueberries",
  12: "Bread",
  13: "Burger Sesame Bun",
  14: "Cashew Nuts",
  15: "Cheese Burger",
  16: "Chicken",
  17: "Chicken Breast Slice",
  18: "Chicken Legs Spiced",
  19: "Chicken Nuggets",
  20: "Chickpeas",
  21: "Chinese Rice",
  22: "Chocolate Mousse",
  23: "Cooked Prawns",
  24: "Cookies",
  25: "Cous Cous",
  26: "Creme Brulee",
  27: "Croissant",
  28: "Dauphinoise",
  29: "Diced Cucumber",
  30: "Egg",
  31: "Eggs Omelette",
  32: "Full English Breakfast",
  33: "Figs",
  34: "French Fries",
  35: "Green Beans",
  36: "Green Olive",
  37: "Ham",
  38: "Jarlsberg Cheese",
  39: "Kiwi",
  40: "Lemon Slice",
  41: "Lemon Wedges",
  42: "Lime",
  43: "Meat Roll with Eggs",
  44: "Mushroom",
  45: "Mussels",
  46: "Naan Bread",
  47: "Octopus",
  48: "Onion",
  49: "Orange",
  50: "Oyster",
  51: "Palmier Pastry",
  52: "Pancake",
  53: "Pear",
  54: "Pineapple",
  55: "Plain Rice",
  56: "Potato",
  57: "Prosciutto",
  58: "Raspberries",
  59: "Roast Ham",
  60: "Salad",
  61: "Salmon Fillet",
  62: "Salmon Sushi",
  63: "Sausage",
  64: "Scrambled Eggs",
  65: "Sliced Carrots",
  66: "Sliced Radish",
  67: "Smoked Salmon",
  68: "Spaghetti",
  69: "Strawberries",
  70: "Sushi",
  71: "Tiramisu",
  72: "Egg & Tomato Toast",
  73: "Tomato Slice",
  74: "Tomatoes",
  75: "Tzatziki",
  76: "White Grapes",
  77: "Yolk"
};

/* ===============================
   CAMERA SETUP
=============================== */
const camera = document.getElementById("camera");
const startCameraBtn = document.getElementById("startCamera");
const captureBtn = document.getElementById("capture");
const uploadInput = document.getElementById("upload");
const loading = document.getElementById("loading");
const resultImage = document.getElementById("resultImage");

// Cards
const nutritionCard = document.getElementById("nutritionCard");
const verdictCard = document.getElementById("verdictCard");
const alternativeCard = document.getElementById("alternativeCard");
const trackingCard = document.getElementById("trackingCard");
const doctorCard = document.getElementById("doctorCard");

// Content areas
const nutritionContent = document.getElementById("nutritionContent");
const verdictContent = document.getElementById("verdictContent");
const alternativeContent = document.getElementById("alternativeContent");
const trackingContent = document.getElementById("trackingContent");
const doctorText = document.getElementById("doctorText");

let stream;

/* ===============================
   START CAMERA
=============================== */
startCameraBtn.addEventListener("click", async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 960 },
                height: { ideal: 540 }
            },
            audio: false
        });

        camera.srcObject = stream;
    } catch (err) {
        console.log("Back camera failed, using fallback:", err);

        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });
            camera.srcObject = stream;
        } catch (err2) {
            alert("Camera access denied.");
        }
    }
});

/* ===============================
   CAPTURE PHOTO
=============================== */
captureBtn.addEventListener("click", () => {
    if (!stream) return alert("Start the camera first!");

    const canvas = document.createElement("canvas");
    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(camera, 0, 0);

    canvas.toBlob((blob) => {
        sendToBackend(blob);
    }, "image/jpeg", 0.6);
});

/* ===============================
   UPLOAD IMAGE
=============================== */
uploadInput.addEventListener("change", () => {
    const file = uploadInput.files[0];
    if (file) sendToBackend(file);
});

/* ===============================
   SEND IMAGE TO BACKEND
=============================== */
async function sendToBackend(file) {
    loading.classList.remove("hidden");

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("https://health-dashboard-ai.onrender.com/predict", {
            method: "POST",
            body: formData
        });

        const data = await response.json();
        console.log("Backend response:", data);

        // Show image
        resultImage.src = "data:image/jpeg;base64," + data.image;
        resultImage.classList.remove("hidden");

        // Extract class ID
        const classId = data.class_id;
        const foodName = CLASS_TO_NAME[classId] || "Unknown Food";

        generateNutrition(foodName);
        generateVerdict(foodName);
        generateAlternative(foodName);
        updateTracking(foodName);
        generateDoctorSummary(foodName);

    } catch (err) {
        alert("Server error. Try again.");
    }

    loading.classList.add("hidden");
}

/* ===============================
   NUTRITION
=============================== */
function generateNutrition(food) {
    nutritionCard.classList.remove("hidden");

    nutritionContent.innerHTML = `
        <strong>Food:</strong> ${food}<br>
        <strong>Calories:</strong> 320 kcal<br>
        <strong>Protein:</strong> 12g<br>
        <strong>Carbs:</strong> 28g<br>
        <strong>Fat:</strong> 18g<br>
        <strong>Saturated Fat:</strong> 4.2g<br>
        <strong>Sodium:</strong> 540mg<br>
        <strong>Sugar:</strong> 5g<br>
    `;
}

/* ===============================
   HEALTH VERDICT
=============================== */
function generateVerdict(food) {
    verdictCard.classList.remove("hidden");

    verdictContent.innerHTML = `
        <strong>Food:</strong> ${food}<br>
        <strong>Cholesterol Impact:</strong> ⚠️ Moderate<br>
        <strong>Blood Pressure:</strong> ⚠️ High sodium<br>
        <strong>Overall Health Score:</strong> 6.5 / 10
    `;
}

/* ===============================
   ALTERNATIVE SUGGESTION
=============================== */
function generateAlternative(food) {
    alternativeCard.classList.remove("hidden");

    alternativeContent.innerHTML = `
        Instead of <strong>${food}</strong>, try <strong>grilled chicken with vegetables</strong>.<br>
        Lower sodium, lower fat, higher protein.
    `;
}

/* ===============================
   WEEKLY TRACKING
=============================== */
function updateTracking(food) {
    trackingCard.classList.remove("hidden");

    let calories = localStorage.getItem("weeklyCalories");
    if (!calories) calories = 0;

    calories = Number(calories) + 320;
    localStorage.setItem("weeklyCalories", calories);

    trackingContent.innerHTML = `
        <strong>Last scanned:</strong> ${food}<br>
        <strong>Total this week:</strong> ${calories} kcal<br>
        <strong>Goal:</strong> 14,000 kcal<br>
        <strong>Progress:</strong> ${(calories / 14000 * 100).toFixed(1)}%
    `;
}

/* ===============================
   AI DOCTOR SUMMARY
=============================== */
function generateDoctorSummary(food) {
    doctorCard.classList.remove("hidden");

    doctorText.innerHTML = `
        <strong>${food}</strong> appears moderately high in sodium and saturated fat.
        Consider balancing it with vegetables or lean protein.
        Suitable in moderation for cholesterol and blood pressure.
    `;
}
