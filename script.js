// --- DOM References ---
const codeInput = document.getElementById('codeInput');
const codePreview = document.getElementById('codePreview');
const codePreviewContainer = document.getElementById('codePreviewContainer');
const outputImageDisplay = document.getElementById('outputImageDisplay');
const pondiverseControlsContainer = document.getElementById('pondiverse-controls');
const languageDisplay = document.getElementById('language-display'); // Get the language display element

// --- State Variables ---
let generatedImageDataUrl = null;
let debounceTimer;
let pondiverseButton = null;
let detectedLanguage = 'auto'; // Store detected language

// --- Code Snippet Generation Logic ---

async function updatePreviewAndGenerateImage() {
    const code = codeInput.value;

    // 1. Auto-detect language and get highlighted HTML
    let result;
    if (code.trim() === '') {
        // Handle empty input gracefully
        result = { value: '', language: 'plaintext' }; // Or 'none', 'auto'
    } else {
        // Use highlightAuto for detection
        result = hljs.highlightAuto(code);
    }

    // Store and display the detected language
    detectedLanguage = result.language || 'auto';
    languageDisplay.textContent = `Detected: ${detectedLanguage}`;

    // 2. Update preview content with highlighted HTML
    codePreview.innerHTML = result.value;

    // 3. Ensure the main code element has the correct language class (optional but good practice)
    codePreview.className = `hljs language-${detectedLanguage}`;

    // 4. Small delay for rendering before capture
    await new Promise(resolve => setTimeout(resolve, 100));

    // 5. Generate image with html2canvas
    try {
        // Ensure the container itself has a background for canvas, or rely on codePreview's background
        const computedStyle = window.getComputedStyle(codePreview); // Get style from code element itself
        const bgColor = computedStyle.backgroundColor || 'transparent'; // Use code block's background

        const canvas = await html2canvas(codePreviewContainer, { // Capture the container
            backgroundColor: null, // Let elements inside define background
             // Ensure the code block's background (set via CSS .hljs) is captured
            scale: 2,
            logging: false,
            useCORS: true,
            // It might be necessary to capture the 'codePreview' directly if container bg interferes
            // const canvas = await html2canvas(codePreview, { ... });
        });

        // 6. Get Data URL
        generatedImageDataUrl = canvas.toDataURL('image/png');
        console.log("Generated Image Data URL (stored in generatedImageDataUrl):", generatedImageDataUrl.substring(0, 100) + "...");

        // 7. Update optional image display
        if (outputImageDisplay) {
            if (generatedImageDataUrl) {
                outputImageDisplay.src = generatedImageDataUrl;
                outputImageDisplay.classList.remove('hidden');
            } else {
                outputImageDisplay.classList.add('hidden');
            }
        }

        // 8. Enable the Pondiverse button
        if (pondiverseButton && pondiverseButton.disabled) {
            pondiverseButton.disabled = false;
            pondiverseButton.textContent = "✶ Share";
            pondiverseButton.title = "Share to Pondiverse"; // Update title
        }

    } catch (error) {
        console.error("Error generating code image:", error);
        generatedImageDataUrl = null;
        if (outputImageDisplay) outputImageDisplay.classList.add('hidden');
        // Optionally disable button again on error
        // if (pondiverseButton) pondiverseButton.disabled = true;
    }
}

// Debounced input handler
function handleInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        updatePreviewAndGenerateImage();
    }, 350);
}

// --- Tab Key Handling ---
function handleTabKey(event) {
    if (event.key === 'Tab') {
        event.preventDefault(); // Prevent default tab behavior (focus change)

        const textarea = event.target;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const tabCharacter = '  '; // Insert 2 spaces for a tab (or use '\t')

        // Set textarea value to: text before caret + tab + text after caret
        textarea.value = textarea.value.substring(0, start) +
                         tabCharacter +
                         textarea.value.substring(end);

        // Put caret at right position again
        textarea.selectionStart = textarea.selectionEnd = start + tabCharacter.length;

        // Trigger the input event manually to update the preview
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
}


// --- Pondiverse Integration Logic (Keep as is from previous step) ---

function addPondiverseButton() {
    pondiverseButton = document.createElement("button");
    pondiverseButton.className = "pondiverse-button";
    pondiverseButton.textContent = "✶ Share";
    pondiverseButton.disabled = true;
    pondiverseButton.title = "Generate a code snippet image first to enable sharing";

    if (pondiverseControlsContainer) {
        pondiverseControlsContainer.append(pondiverseButton);
    } else {
        console.error("Pondiverse controls container not found!");
    }

    const dialog = document.createElement("dialog");
    dialog.id = "pondiverse-dialog";
    dialog.innerHTML = `
    <form method="dialog">
      <p>Share your code snippet to the <a href="https://pondiverse.com" target="_blank" rel="noopener noreferrer">Pondiverse</a>?</p>
      <p><em>(Creations auto-delete after 25 hours)</em></p>
      <img id="preview-image" src="" alt="Code Snippet Preview">
      <label for="pondiverse-name">Title</label>
      <input type="text" id="pondiverse-name" name="name" required autocomplete="off" spellcheck="false" />
      <input type="hidden" name="data" value="" />
      <input type="hidden" name="type" value="" />
      <hgroup class="space">
          <button type="button" class="secondary cancel">Cancel</button>
          <button type="submit" class="submit">Publish</button>
      </hgroup>
    </form>
    `;
    document.body.append(dialog);

    const form = dialog.querySelector("form");
    const previewImage = dialog.querySelector("#preview-image");
    const nameInput = dialog.querySelector("#pondiverse-name");
    const cancelButton = dialog.querySelector("button.cancel");
    const publishButton = dialog.querySelector("button.submit");
    const hiddenDataInput = dialog.querySelector("input[name='data']");
    const hiddenTypeInput = dialog.querySelector("input[name='type']");

    previewImage.onerror = () => { previewImage.style.display = "none"; console.warn("Pondiverse preview image failed to load."); };
    previewImage.onload = () => { previewImage.style.display = "block"; };
    nameInput.addEventListener("keydown", (e) => { e.stopPropagation(); });
    cancelButton.addEventListener("click", (e) => { e.stopPropagation(); closePondiverseDialog(); });
    dialog.addEventListener("click", (event) => { if (event.target === dialog) { closePondiverseDialog(); } });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const request = {
            title: nameInput.value,
            data: hiddenDataInput.value,
            type: hiddenTypeInput.value,
            image: previewImage.src,
        };
        publishButton.disabled = true; publishButton.textContent = "Publishing..."; publishButton.style.cursor = "not-allowed"; cancelButton.disabled = true;
        try {
            const response = await fetch("https://todepond--e03ca2bc21bb11f094e3569c3dd06744.web.val.run", {
                method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request),
            });
            if (response.ok) { console.log("Successfully published to Pondiverse!"); closePondiverseDialog(); }
            else { console.error("Pondiverse upload failed:", response.status, await response.text()); alert(`Upload failed (${response.status}). Please try again.`); publishButton.disabled = false; publishButton.textContent = "Publish"; publishButton.style.cursor = "pointer"; cancelButton.disabled = false; }
        } catch (error) { console.error("Error during Pondiverse fetch:", error); alert("An error occurred while publishing. Check the console."); publishButton.disabled = false; publishButton.textContent = "Publish"; publishButton.style.cursor = "pointer"; cancelButton.disabled = false; }
    });

    pondiverseButton.addEventListener("click", (e) => { e.stopPropagation(); if (!pondiverseButton.disabled) { openPondiverseDialog(); } });
}

function openPondiverseDialog() {
    const dialog = document.getElementById("pondiverse-dialog");
    if (!dialog) { console.error("Pondiverse dialog not found."); return; }
    const creation = window.getPondiverseCreation();
    if (!creation || !creation.image) { alert("Please generate the code snippet image first by typing some code."); console.warn("Cannot open Pondiverse dialog: Image data not available."); return; }
    const previewImage = dialog.querySelector("#preview-image"); const nameInput = dialog.querySelector("#pondiverse-name"); const hiddenDataInput = dialog.querySelector("input[name='data']"); const hiddenTypeInput = dialog.querySelector("input[name='type']"); const publishButton = dialog.querySelector("button.submit"); const cancelButton = dialog.querySelector("button.cancel");
    previewImage.src = creation.image || ""; previewImage.style.display = creation.image ? 'block' : 'none';
    hiddenDataInput.value = creation.data || ""; hiddenTypeInput.value = creation.type || "CodePond";
    nameInput.value = ""; publishButton.disabled = false; publishButton.textContent = "Publish"; publishButton.style.cursor = "pointer"; cancelButton.disabled = false;
    dialog.showModal(); nameInput.focus();
}

function closePondiverseDialog() {
    const dialog = document.getElementById("pondiverse-dialog");
    if (dialog) { dialog.close(); }
}

window.getPondiverseCreation = function() {
    return { type: "CodePond", data: codeInput.value, image: generatedImageDataUrl };
};


// --- Event Listeners ---
codeInput.addEventListener('input', handleInput);
codeInput.addEventListener('keydown', handleTabKey); // Add listener for Tab key

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    addPondiverseButton();
    // Initial highlight if code exists on load
    if (codeInput.value) {
        updatePreviewAndGenerateImage();
    }
});