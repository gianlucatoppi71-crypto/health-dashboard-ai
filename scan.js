// ===============================
// CAMERA SETUP
// ===============================
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

// Start camera
startCameraBtn.addEventListener("click", async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        camera.srcObject = stream;
    } catch (err) {
        alert("Camera access denied or unavailable.");
    }
});

// Capture photo
captureBtn.addEventListener("click", () => {
    if (!stream) return alert("Start the camera first!");

    const canvas = document.createElement("canvas");
    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(camera, 0, 0);

    canvas.toBlob((blob) => {
        sendToBackend(blob);
    }, "image/jpeg");
});

// Upload image
uploadInput.addEventListener("change", () => {
    const file = uploadInput.files[0];
    if (file) sendToBackend(file);
});

// ===============================
// SEND IMAGE TO BACKEND
// ===============================
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

        // Show annotated image
        resultImage.src = "data:image/jpeg;base64," + data.image;
        resultImage.classList.remove("hidden");

        // Generate all cards
        generateNutrition();
        generateVerdict();
        generateAlternative();
        updateTracking();
        generateDoctorSummary();

    } catch (err) {
        alert("Error contacting the AI server.");
    }

    loading.classList.add("hidden");
}

// ===============================
// NUTRITION (FAKE AI FOR NOW)
// ===============================
function generateNutrition() {
    nutritionCard.classList.remove("hidden");

    nutritionContent.innerHTML = `
        <strong>Calories:</strong> 320 kcal<br>
        <strong>Protein:</strong> 12g<br>
        <strong>Carbs:</strong> 28g<br>
        <strong>Fat:</strong> 18g<br>
        <strong>Saturated Fat:</strong> 4.2g<br>
        <strong>Sodium:</strong> 540mg<br>
        <strong>Sugar:</strong> 5g<br>
    `;
}

// ===============================
// HEALTH VERDICT
// ===============================
function generateVerdict() {
    verdictCard.classList.remove("hidden");

    verdictContent.innerHTML = `
        <strong>Cholesterol Impact:</strong> ⚠️ Moderate<br>
        <strong>Blood Pressure:</strong> ⚠️ High sodium<br>
        <strong>Overall Health Score:</strong> 6.5 / 10
    `;
}

// ===============================
// ALTERNATIVE SUGGESTION
// ===============================
function generateAlternative() {
    alternativeCard.classList.remove("hidden");

    alternativeContent.innerHTML = `
        Try <strong>grilled chicken with vegetables</strong> instead.<br>
        Lower sodium, lower fat, higher protein.
    `;
}

// ===============================
// WEEKLY TRACKING
// ===============================
function updateTracking() {
    trackingCard.classList.remove("hidden");

    let calories = localStorage.getItem("weeklyCalories");
    if (!calories) calories = 0;

    calories = Number(calories) + 320; // add today's food
    localStorage.setItem("weeklyCalories", calories);

    trackingContent.innerHTML = `
        <strong>Total this week:</strong> ${calories} kcal<br>
        <strong>Goal:</strong> 14,000 kcal<br>
        <strong>Progress:</strong> ${(calories / 14000 * 100).toFixed(1)}%
    `;
}

// ===============================
// AI DOCTOR SUMMARY
// ===============================
function generateDoctorSummary() {
    doctorCard.classList.remove("hidden");

    doctorText.innerHTML = `
        This food appears moderately high in sodium and saturated fat.
        Consider balancing it with vegetables or lean protein.
        Suitable in moderation for cholesterol and blood pressure.
    `;
}
