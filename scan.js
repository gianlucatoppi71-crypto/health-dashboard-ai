// BASIC STATE
let currentStream = null;
let barcodeStream = null;
let currentCardIndex = 0;
let totalCards = 10;

// DOM ELEMENTS
const cameraModeBtn = document.getElementById("cameraModeBtn");
const barcodeModeBtn = document.getElementById("barcodeModeBtn");
const cameraSection = document.getElementById("cameraSection");
const barcodeSection = document.getElementById("barcodeSection");
const cameraPreview = document.getElementById("cameraPreview");
const barcodePreview = document.getElementById("barcodePreview");
const captureBtn = document.getElementById("captureBtn");
const startBarcodeBtn = document.getElementById("startBarcodeBtn");
const loadingOverlay = document.getElementById("loadingOverlay");
const resultsSection = document.getElementById("resultsSection");
const carouselTrack = document.getElementById("carouselTrack");

// RESULT FIELDS
const foodNameEl = document.getElementById("foodName");
const foodConfidenceEl = document.getElementById("foodConfidence");
const foodCategoryEl = document.getElementById("foodCategory");
const foodPortionEl = document.getElementById("foodPortion");

const foodCaloriesEl = document.getElementById("foodCalories");
const todayCaloriesEl = document.getElementById("todayCalories");
const calorieGoalEl = document.getElementById("calorieGoal");
const calorieProgressFill = document.getElementById("calorieProgressFill");
const calorieStatusText = document.getElementById("calorieStatusText");

const proteinEl = document.getElementById("protein");
const carbsEl = document.getElementById("carbs");
const sugarEl = document.getElementById("sugar");
const fatEl = document.getElementById("fat");
const fibreEl = document.getElementById("fibre");
const saltEl = document.getElementById("salt");

const bpImpactText = document.getElementById("bpImpactText");
const cholImpactText = document.getElementById("cholImpactText");
const cvRiskText = document.getElementById("cvRiskText");
const limitText = document.getElementById("limitText");
const alternativesList = document.getElementById("alternativesList");
const doctorSummaryText = document.getElementById("doctorSummaryText");
const fastingText = document.getElementById("fastingText");

// INITIAL CALORIE GOAL (will be replaced by onboarding later)
function getCalorieGoal() {
    const stored = Number(localStorage.getItem("calorieGoal"));
    if (!stored || stored < 800) {
        // temporary default until onboarding exists
        return 2000;
    }
    return stored;
}

// CAMERA HANDLING
async function startCamera(videoEl, forBarcode = false) {
    stopStreams();
    try {
        const constraints = {
            video: {
                facingMode: "environment"
            },
            audio: false
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoEl.srcObject = stream;
        if (forBarcode) {
            barcodeStream = stream;
        } else {
            currentStream = stream;
        }
    } catch (err) {
        console.error("Camera error:", err);
        alert("Unable to access camera. Please check permissions.");
    }
}

function stopStreams() {
    if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
        currentStream = null;
    }
    if (barcodeStream) {
        barcodeStream.getTracks().forEach(t => t.stop());
        barcodeStream = null;
    }
}

// IMAGE RESIZE BEFORE UPLOAD
function resizeImageFromVideo(videoEl, maxWidth = 640, maxHeight = 640) {
    return new Promise(resolve => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        let width = videoEl.videoWidth;
        let height = videoEl.videoHeight;

        if (!width || !height) {
            resolve(null);
            return;
        }

        if (width > height) {
            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }
        } else {
            if (height > maxHeight) {
                width *= maxHeight / height;
                height = maxHeight;
            }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(videoEl, 0, 0, width, height);

        canvas.toBlob(
            blob => {
                resolve(blob);
            },
            "image/jpeg",
            0.8
        );
    });
}

// API CALL – FOOD SCAN
async function analyseFoodFromCamera() {
    loadingOverlay.classList.remove("hidden");
    try {
        const blob = await resizeImageFromVideo(cameraPreview);
        if (!blob) {
            throw new Error("No image captured.");
        }

        const formData = new FormData();
        formData.append("file", blob, "scan.jpg");

        // TODO: replace with your real backend endpoint
        const res = await fetch("YOUR_FOOD_SCAN_ENDPOINT_HERE", {
            method: "POST",
            body: formData
        });

        if (!res.ok) {
            throw new Error("Scan failed");
        }

        const data = await res.json();
        handleFoodScanResult(data);
    } catch (err) {
        console.error(err);
        alert("There was a problem analysing this food. Please try again.");
    } finally {
        loadingOverlay.classList.add("hidden");
    }
}

// HANDLE FOOD RESULT
function handleFoodScanResult(data) {
    // Example expected structure – adapt to your backend
    const {
        name = "Unknown food",
        confidence = 0.0,
        category = "–",
        portion = "1 serving",
        calories = 0,
        protein = 0,
        carbs = 0,
        sugar = 0,
        fat = 0,
        fibre = 0,
        salt = 0
    } = data.food || {};

    // Fill basic info
    foodNameEl.textContent = name;
    foodConfidenceEl.textContent = `${Math.round(confidence * 100)}%`;
    foodCategoryEl.textContent = category;
    foodPortionEl.textContent = portion;

    foodCaloriesEl.textContent = Math.round(calories);
    proteinEl.textContent = protein.toFixed(1);
    carbsEl.textContent = carbs.toFixed(1);
    sugarEl.textContent = sugar.toFixed(1);
    fatEl.textContent = fat.toFixed(1);
    fibreEl.textContent = fibre.toFixed(1);
    saltEl.textContent = salt.toFixed(2);

    // Update calories + goal
    updateCaloriesAndGoal(calories);

    // Generate health logic
    const bpScore = computeBpScore(salt, potassiumFromCategory(category));
    const cholScore = computeCholScore(fat, saturatedFromCategory(category));
    const foodScore = computeFoodScore(calories, protein, fibre, sugar, salt);
    const calorieScore = computeCalorieScore();

    const healthScore = Math.round(
        (bpScore + cholScore + foodScore + calorieScore) / 4
    );

    // Text explanations
    bpImpactText.textContent = buildBpText(salt, bpScore);
    cholImpactText.textContent = buildCholText(fat, cholScore);
    cvRiskText.textContent = buildCvRiskText(bpScore, cholScore, foodScore);
    limitText.textContent = buildLimitText(foodScore, bpScore, cholScore);
    buildAlternativesList(category, alternativesList);
    doctorSummaryText.textContent = buildDoctorSummary(
        name,
        category,
        bpScore,
        cholScore,
        foodScore,
        calorieScore
    );
    fastingText.textContent = buildFastingText();

    // Save to localStorage for AURA
    localStorage.setItem("foodScore", String(foodScore));
    localStorage.setItem("bpScore", String(bpScore));
    localStorage.setItem("cholScore", String(cholScore));
    localStorage.setItem("calorieScore", String(calorieScore));
    localStorage.setItem("healthScore", String(healthScore));

    // Show results
    resultsSection.classList.remove("hidden");
    goToCard(0);
}

// CALORIE LOGIC
function updateCaloriesAndGoal(foodCalories) {
    const goal = getCalorieGoal();
    let today = Number(localStorage.getItem("todayCalories") || 0);
    today += foodCalories;
    localStorage.setItem("todayCalories", String(today));

    todayCaloriesEl.textContent = Math.round(today);
    calorieGoalEl.textContent = goal;

    const progress = Math.min((today / goal) * 100, 200); // cap at 200%
    calorieProgressFill.style.width = `${progress}%`;

    let status = "";
    if (progress < 70) {
        status = "You are within a comfortable range for today.";
    } else if (progress < 100) {
        status = "You are approaching your daily calorie goal.";
    } else {
        status = "You have exceeded your daily calorie goal. Consider lighter choices or fasting.";
    }
    calorieStatusText.textContent = status;
}

function computeCalorieScore() {
    const goal = getCalorieGoal();
    const today = Number(localStorage.getItem("todayCalories") || 0);
    if (!goal) return 50;
    const ratio = today / goal;
    if (ratio <= 1) {
        return Math.round(100 - (ratio - 0.7) * 100); // gentle drop near goal
    }
    if (ratio > 1 && ratio <= 1.5) {
        return Math.round(70 - (ratio - 1) * 80);
    }
    return 30;
}

// SIMPLE HEALTH SCORING HELPERS
function computeBpScore(salt, potassiumScore) {
    // salt in g, potassiumScore 0–100
    let score = 100;
    if (salt > 2) score -= 25;
    if (salt > 4) score -= 25;
    score += (potassiumScore - 50) * 0.3;
    return clamp(score, 0, 100);
}

function computeCholScore(fat, satScore) {
    let score = 100;
    if (fat > 20) score -= 20;
    if (fat > 30) score -= 20;
    score -= (satScore - 50) * 0.4;
    return clamp(score, 0, 100);
}

function computeFoodScore(calories, protein, fibre, sugar, salt) {
    let score = 70;
    if (protein > 15) score += 10;
    if (fibre > 5) score += 10;
    if (sugar > 20) score -= 15;
    if (salt > 2) score -= 15;
    if (calories > 600) score -= 10;
    return clamp(score, 0, 100);
}

function potassiumFromCategory(category) {
    if (!category) return 50;
    const c = category.toLowerCase();
    if (c.includes("fruit") || c.includes("vegetable")) return 80;
    if (c.includes("processed") || c.includes("snack")) return 40;
    return 50;
}

function saturatedFromCategory(category) {
    if (!category) return 50;
    const c = category.toLowerCase();
    if (c.includes("fried") || c.includes("fast") || c.includes("processed")) return 80;
    if (c.includes("lean") || c.includes("vegetable")) return 40;
    return 50;
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

// TEXT BUILDERS
function buildBpText(salt, bpScore) {
    if (bpScore >= 75) {
        return "This food is low in salt and generally supportive of healthy blood pressure.";
    }
    if (bpScore >= 50) {
        return "This food has a moderate salt content. It is usually acceptable if eaten in moderation.";
    }
    return "This food is relatively high in salt and may contribute to raised blood pressure if eaten frequently.";
}

function buildCholText(fat, cholScore) {
    if (cholScore >= 75) {
        return "This food is relatively low in unhealthy fats and is compatible with cholesterol control.";
    }
    if (cholScore >= 50) {
        return "This food contains some fat. It can fit into a balanced diet if portions are controlled.";
    }
    return "This food is high in fat that may raise LDL (“bad”) cholesterol if eaten regularly.";
}

function buildCvRiskText(bpScore, cholScore, foodScore) {
    const avg = (bpScore + cholScore + foodScore) / 3;
    if (avg >= 75) {
        return "This choice is not expected to significantly increase long‑term cardiovascular risk when eaten as part of a balanced diet.";
    }
    if (avg >= 50) {
        return "If eaten often, this food may contribute to higher cardiovascular risk. Balancing it with heart‑healthy meals is advisable.";
    }
    return "Regular intake of foods like this may increase the risk of artery plaque, blood clots, stroke and heart attack over time.";
}

function buildLimitText(foodScore, bpScore, cholScore) {
    const avg = (foodScore + bpScore + cholScore) / 3;
    if (avg >= 70) {
        return "This food does not need strict limitation for most people when eaten in reasonable portions.";
    }
    if (avg >= 50) {
        return "Limiting portion size and frequency can help protect blood pressure and cholesterol over the long term.";
    }
    return "Because of its impact on salt, fat or calories, this food is best kept as an occasional choice rather than a daily habit.";
}

function buildAlternativesList(category, ul) {
    ul.innerHTML = "";
    const items = [];

    const c = (category || "").toLowerCase();
    if (c.includes("snack") || c.includes("crisps") || c.includes("chips")) {
        items.push("Unsalted nuts or seeds");
        items.push("Air‑popped popcorn without added butter");
        items.push("Fresh fruit or vegetable sticks");
    } else if (c.includes("meat") || c.includes("processed")) {
        items.push("Grilled chicken or turkey without skin");
        items.push("Beans, lentils or chickpeas");
        items.push("Fish baked or grilled instead of fried");
    } else if (c.includes("dessert") || c.includes("sweet")) {
        items.push("Fresh fruit with yogurt");
        items.push("Small portion of dark chocolate");
        items.push("Oats with fruit and cinnamon");
    } else {
        items.push("Fresh vegetables and salads with minimal dressing");
        items.push("Whole‑grain options instead of refined products");
        items.push("Water or unsweetened drinks instead of sugary beverages");
    }

    items.forEach(text => {
        const li = document.createElement("li");
        li.textContent = text;
        ul.appendChild(li);
    });
}

function buildDoctorSummary(
    name,
    category,
    bpScore,
    cholScore,
    foodScore,
    calorieScore
) {
    const avg = Math.round((bpScore + cholScore + foodScore + calorieScore) / 4);
    const cat = category || "this food";

    if (avg >= 75) {
        return `${name} appears generally compatible with heart health when eaten in appropriate portions. It is relatively favourable for blood pressure and cholesterol and can be included regularly as part of a balanced, varied diet.`;
    }
    if (avg >= 50) {
        return `${name} can fit into a balanced diet, but its salt, fat or calorie content means that portion size and frequency matter. Combining it with plenty of vegetables, whole grains and lean proteins helps protect blood pressure and cholesterol over time.`;
    }
    return `${name} is not an ideal choice for cardiovascular health if eaten frequently. Its profile suggests a higher impact on blood pressure, cholesterol or overall calorie load. Keeping it as an occasional food and prioritising heart‑healthy alternatives is advisable, especially for people at risk of high blood pressure, high cholesterol or heart disease.`;
}

function buildFastingText() {
    const goal = getCalorieGoal();
    const today = Number(localStorage.getItem("todayCalories") || 0);
    const ratio = today / goal;

    if (ratio < 0.7) {
        return "Your intake so far is comfortably below your daily calorie goal. A regular overnight fasting window of 12 hours is usually sufficient for most people unless advised otherwise by a clinician.";
    }
    if (ratio <= 1.1) {
        return "You are close to your daily calorie goal. Allowing a 12–14 hour overnight fasting window may help stabilise blood sugar and support cardiovascular health, particularly if combined with balanced meals.";
    }
    return "You have exceeded your daily calorie goal today. A structured overnight fast of around 14 hours, alongside lighter choices at the next meals, may help restore balance. People with diabetes or other medical conditions should always seek personalised medical advice before changing fasting patterns.";
}

// BARCODE SCANNING
let barcodeReader = null;
let barcodeActive = false;

async function startBarcodeScanner() {
    if (barcodeActive) return;
    barcodeActive = true;

    await startCamera(barcodePreview, true);

    if (!barcodeReader) {
        barcodeReader = new ZXing.BrowserMultiFormatReader();
    }

    barcodeReader
        .decodeFromVideoDevice(null, barcodePreview, (result, err) => {
            if (result) {
                barcodeActive = false;
                barcodeReader.reset();
                stopStreams();
                handleBarcodeResult(result.getText());
            }
        })
        .catch(err => {
            console.error(err);
            alert("Unable to start barcode scanner.");
            barcodeActive = false;
        });
}

async function handleBarcodeResult(code) {
    loadingOverlay.classList.remove("hidden");
    try {
        // TODO: replace with your real barcode nutrition endpoint
        const res = await fetch(
            `YOUR_BARCODE_ENDPOINT_HERE?code=${encodeURIComponent(code)}`
        );
        if (!res.ok) throw new Error("Barcode lookup failed");
        const data = await res.json();
        handleFoodScanResult(data);
    } catch (err) {
        console.error(err);
        alert("Unable to retrieve nutrition data for this barcode.");
    } finally {
        loadingOverlay.classList.add("hidden");
    }
}

// CAROUSEL SWIPE
let startX = 0;
let currentTranslate = 0;
let isDragging = false;

carouselTrack.addEventListener("touchstart", e => {
    if (!e.touches || e.touches.length === 0) return;
    isDragging = true;
    startX = e.touches[0].clientX;
});

carouselTrack.addEventListener("touchmove", e => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - startX;
    const width = carouselTrack.clientWidth / totalCards;
    const offset = -currentCardIndex * width + dx;
    carouselTrack.style.transition = "none";
    carouselTrack.style.transform = `translateX(${offset}px)`;
});

carouselTrack.addEventListener("touchend", e => {
    if (!isDragging) return;
    isDragging = false;
    const dx = e.changedTouches[0].clientX - startX;
    const threshold = 50;
    if (dx > threshold && currentCardIndex > 0) {
        currentCardIndex--;
    } else if (dx < -threshold && currentCardIndex < totalCards - 1) {
        currentCardIndex++;
    }
    goToCard(currentCardIndex);
});

function goToCard(index) {
    currentCardIndex = index;
    const width = carouselTrack.clientWidth / totalCards;
    const offset = -index * width;
    carouselTrack.style.transition = "transform 0.35s ease-out";
    carouselTrack.style.transform = `translateX(${offset}px)`;
}

// MODE SWITCH
cameraModeBtn.addEventListener("click", () => {
    cameraModeBtn.classList.add("active");
    barcodeModeBtn.classList.remove("active");
    cameraSection.classList.add("active");
    barcodeSection.classList.remove("active");
    stopStreams();
    startCamera(cameraPreview, false);
});

barcodeModeBtn.addEventListener("click", () => {
    barcodeModeBtn.classList.add("active");
    cameraModeBtn.classList.remove("active");
    barcodeSection.classList.add("active");
    cameraSection.classList.remove("active");
    stopStreams();
});

// BUTTONS
captureBtn.addEventListener("click", () => {
    analyseFoodFromCamera();
});

startBarcodeBtn.addEventListener("click", () => {
    startBarcodeScanner();
});

// INIT
window.addEventListener("load", () => {
    // Start camera in camera mode by default
    startCamera(cameraPreview, false);

    // Initialise calorie UI
    const goal = getCalorieGoal();
    const today = Number(localStorage.getItem("todayCalories") || 0);
    todayCaloriesEl.textContent = Math.round(today);
    calorieGoalEl.textContent = goal;
    const progress = Math.min((today / goal) * 100, 200);
    calorieProgressFill.style.width = `${progress}%`;
});
