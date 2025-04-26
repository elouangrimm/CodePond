// --- DOM References ---
const codeInput = document.getElementById('codeInput');
const codePreview = document.getElementById('codePreview');
const codePreviewContainer = document.getElementById('codePreviewContainer');
const outputImageDisplay = document.getElementById('outputImageDisplay');
const pondiverseControlsContainer = document.getElementById('pondiverse-controls');
const languageDisplay = document.getElementById('language-display');

// Customization Controls
const themeSelect = document.getElementById('theme-select');
const bgColorPicker = document.getElementById('bg-color-picker');
const paddingSlider = document.getElementById('padding-slider');
const paddingValueDisplay = document.getElementById('padding-value');
const fontSizeSlider = document.getElementById('font-size-slider');
const fontSizeValueDisplay = document.getElementById('font-size-value');
const fontFamilySelect = document.getElementById('font-family-select');
const themeLink = document.getElementById('hljs-theme-link'); // Get the theme link tag

// --- State Variables ---
let generatedImageDataUrl = null;
let inputDebounceTimer;
let styleDebounceTimer; // Separate debounce timer for style changes
let pondiverseButton = null;
let detectedLanguage = 'auto';

// --- Style Customization Logic ---

function updateValueDisplay(slider, display, unit) {
    display.textContent = `${slider.value}${unit}`;
}

function applyCustomizations() {
    // Read values from controls
    const padding = `${paddingSlider.value}px`;
    const fontSize = `${fontSizeSlider.value}em`;
    const fontFamily = fontFamilySelect.value;
    const bgColor = bgColorPicker.value;
    const selectedTheme = themeSelect.value;

    // Update CSS variables on the root element (affects elements using them)
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--code-padding', padding);
    rootStyle.setProperty('--code-font-size', fontSize);
    rootStyle.setProperty('--code-font-family', fontFamily);
    rootStyle.setProperty('--code-bg-color', bgColor);

    // Update Theme Stylesheet
    const themeBaseUrl = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/';
    themeLink.href = `${themeBaseUrl}${selectedTheme}.min.css`;

    // Update slider value displays
    updateValueDisplay(paddingSlider, paddingValueDisplay, 'px');
    updateValueDisplay(fontSizeSlider, fontSizeValueDisplay, 'em');

    // Trigger a re-highlight and image regeneration (debounced)
    clearTimeout(styleDebounceTimer);
    styleDebounceTimer = setTimeout(() => {
         console.log("Applying style changes and regenerating image...");
         updatePreviewAndGenerateImage(); // Re-run highlighting and image generation
    }, 250); // Debounce style updates slightly less aggressively than input
}


// --- Code Snippet Generation Logic ---

async function updatePreviewAndGenerateImage() {
    console.log("Updating preview and image...");
    const code = codeInput.value;

    // 1. Clear previous highlighting classes potentially left by old theme
    // codePreview.className = 'hljs'; // Reset before applying new highlight

    // 2. Auto-detect language and get highlighted HTML
    let result;
    if (code.trim() === '') {
        result = { value: '', language: 'plaintext' };
    } else {
         // Force re-highlighting even if code hasn't changed (theme/style might have)
        // Use highlight() instead of highlightAuto() if language is known,
        // but highlightAuto is usually fine and handles language changes.
        // Need to ensure hljs state is clean if themes change rapidly.
        // Forcing highlight by passing code directly:
        result = hljs.highlightAuto(code);
    }

    detectedLanguage = result.language || 'auto';
    languageDisplay.textContent = `Detected: ${detectedLanguage}`;

    // 3. Update preview content
    codePreview.innerHTML = result.value;
    // Apply the language class *after* setting innerHTML based on result
    codePreview.className = `hljs language-${detectedLanguage}`;


    // 4. Small delay - *May need adjustment after theme loading*
    // Allow styles (especially new theme) to apply
    await new Promise(resolve => setTimeout(resolve, 150)); // Slightly longer delay

    // 5. Generate image
    try {
        // Capture the container, relying on CSS vars for its style
        const canvas = await html2canvas(codePreviewContainer, {
            backgroundColor: null, // Use element's background from CSS var
            scale: 2,
            logging: false,
            useCORS: true, // Needed for web fonts / external assets potentially
            onclone: (clonedDoc) => {
                // Attempt to fix theme loading issue for html2canvas in some browsers
                // Re-apply the theme link href in the cloned document
                const clonedThemeLink = clonedDoc.getElementById('hljs-theme-link');
                if (clonedThemeLink) {
                     clonedThemeLink.href = themeLink.href;
                }
            }
        });

        // 6. Get Data URL
        generatedImageDataUrl = canvas.toDataURL('image/png');
        // console.log("Generated Image Data URL:", generatedImageDataUrl.substring(0, 100) + "...");

        // 7. Update display
        if (outputImageDisplay) {
            if (generatedImageDataUrl) {
                outputImageDisplay.src = generatedImageDataUrl;
                outputImageDisplay.classList.remove('hidden');
            } else {
                outputImageDisplay.classList.add('hidden');
            }
        }

        // 8. Enable Pondiverse button
        if (pondiverseButton && pondiverseButton.disabled) {
            pondiverseButton.disabled = false;
            pondiverseButton.textContent = "✶ Share";
            pondiverseButton.title = "Share to Pondiverse";
        }

    } catch (error) {
        console.error("Error generating code image:", error);
        generatedImageDataUrl = null;
        if (outputImageDisplay) outputImageDisplay.classList.add('hidden');
    }
}

// Debounced input handler
function handleInput() {
    clearTimeout(inputDebounceTimer);
    inputDebounceTimer = setTimeout(() => {
        updatePreviewAndGenerateImage();
    }, 350);
}

// Tab Key Handling (Keep as is)
function handleTabKey(event) {
    if (event.key === 'Tab') {
        event.preventDefault();
        const textarea = event.target; const start = textarea.selectionStart; const end = textarea.selectionEnd; const tabCharacter = '  ';
        textarea.value = textarea.value.substring(0, start) + tabCharacter + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + tabCharacter.length;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

// --- Pondiverse Integration Logic (Keep as is) ---
function addPondiverseButton() { /* ... (no changes needed here) ... */
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
function openPondiverseDialog() { /* ... (no changes needed here) ... */
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
function closePondiverseDialog() { /* ... (no changes needed here) ... */
    const dialog = document.getElementById("pondiverse-dialog");
    if (dialog) { dialog.close(); }
}
window.getPondiverseCreation = function() { /* ... (no changes needed here) ... */
    return { type: "CodePond", data: codeInput.value, image: generatedImageDataUrl };
};


// --- Event Listeners ---
codeInput.addEventListener('input', handleInput);
codeInput.addEventListener('keydown', handleTabKey);

// Customization Control Listeners
themeSelect.addEventListener('change', applyCustomizations);
bgColorPicker.addEventListener('input', applyCustomizations);
paddingSlider.addEventListener('input', applyCustomizations);
fontSizeSlider.addEventListener('input', applyCustomizations);
fontFamilySelect.addEventListener('change', applyCustomizations);


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    addPondiverseButton();
    applyCustomizations(); // Apply initial default styles from controls
    // Initial highlight if code exists on load
    if (codeInput.value) {
        updatePreviewAndGenerateImage(); // Generate initial preview/image
    } else {
        // Ensure Pondiverse button is disabled initially if no code
         if(pondiverseButton) pondiverseButton.disabled = true;
    }
});