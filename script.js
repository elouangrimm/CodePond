// --- DOM References ---
const codeInput = document.getElementById('codeInput');
const codePreview = document.getElementById('codePreview');
const codePreviewContainer = document.getElementById('codePreviewContainer');
const outputImageDisplay = document.getElementById('outputImageDisplay');
const pondiverseControlsContainer = document.getElementById('pondiverse-controls');
const languageDisplay = document.getElementById('language-display');
const copyImageButton = document.getElementById('copy-image-button');

// Customization Controls
const languageSelect = document.getElementById('language-select'); // <-- Add Language Select
const themeSelect = document.getElementById('theme-select');
const bgColorPicker = document.getElementById('bg-color-picker');
const paddingSlider = document.getElementById('padding-slider');
const paddingValueDisplay = document.getElementById('padding-value');
const fontSizeSlider = document.getElementById('font-size-slider');
const fontSizeValueDisplay = document.getElementById('font-size-value');
const fontFamilySelect = document.getElementById('font-family-select');
const themeLink = document.getElementById('hljs-theme-link');

// --- State Variables ---
let generatedImageDataUrl = null;
let inputDebounceTimer;
let styleDebounceTimer; // Separate debounce timer for style changes
let pondiverseButton = null;

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
    // Language selection is handled directly in updatePreviewAndGenerateImage
    // but changing it should trigger a preview update.

    // Update CSS variables
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

    // Trigger re-highlight and image regeneration
    clearTimeout(styleDebounceTimer);
    styleDebounceTimer = setTimeout(() => {
         console.log("Applying style changes and regenerating image...");
         updatePreviewAndGenerateImage();
    }, 250);
}


// --- Code Snippet Generation Logic ---

async function updatePreviewAndGenerateImage() {
    console.log("Updating preview and image...");
    const code = codeInput.value;
    const selectedLanguage = languageSelect.value; // Get selected language override

    // 1. Highlight code based on selection
    let result;
    let displayLangText;

    if (code.trim() === '') {
        // Handle empty input
        result = { value: '', language: 'plaintext' };
        displayLangText = 'Detected: plaintext';
    } else if (selectedLanguage === 'auto') {
        // Auto-detect language
        result = hljs.highlightAuto(code);
        displayLangText = `Detected: ${result.language || 'auto'}`;
    } else {
        // Force highlighting with the selected language
        try {
            // Check if language is supported before highlighting
            if (hljs.getLanguage(selectedLanguage)) {
                 result = hljs.highlight(code, { language: selectedLanguage });
                 displayLangText = `Language: ${selectedLanguage} (Forced)`;
            } else {
                 // Fallback if selected language isn't loaded/valid (shouldn't happen with pack)
                 console.warn(`Language "${selectedLanguage}" not recognized by highlight.js. Falling back to auto-detect.`);
                 result = hljs.highlightAuto(code);
                 displayLangText = `Detected: ${result.language || 'auto'} (Fallback)`;
            }
        } catch (error) {
            console.error(`Error highlighting with language "${selectedLanguage}":`, error);
             // Fallback on error during specific language highlight
            result = hljs.highlightAuto(code);
            displayLangText = `Detected: ${result.language || 'auto'} (Error Fallback)`;
        }
    }

    // Update language display text
    languageDisplay.textContent = displayLangText;

    // 2. Update preview content
    codePreview.innerHTML = result.value;
    // Apply the correct language class
    codePreview.className = `hljs language-${result.language || selectedLanguage || 'plaintext'}`;


    // 3. Small delay for rendering
    await new Promise(resolve => setTimeout(resolve, 150));

    // 4. Generate image
    try {
        const canvas = await html2canvas(codePreviewContainer, {
            backgroundColor: null, scale: 2, logging: false, useCORS: true,
            onclone: (clonedDoc) => {
                const clonedThemeLink = clonedDoc.getElementById('hljs-theme-link');
                if (clonedThemeLink) { clonedThemeLink.href = themeLink.href; }
            }
        });

        // 5. Get Data URL
        generatedImageDataUrl = canvas.toDataURL('image/png');

        // 6. Update display & Enable buttons
        if (outputImageDisplay) {
            if (generatedImageDataUrl) { /*...*/ outputImageDisplay.src = generatedImageDataUrl; outputImageDisplay.classList.remove('hidden'); }
            else { /*...*/ outputImageDisplay.classList.add('hidden'); }
        }

        if (generatedImageDataUrl) {
            if (pondiverseButton && pondiverseButton.disabled) { /*...*/ pondiverseButton.disabled = false; pondiverseButton.textContent = "✶ Share"; pondiverseButton.title = "Share to Pondiverse"; }
            if (copyImageButton && copyImageButton.disabled) { /*...*/ copyImageButton.disabled = false; copyImageButton.title = "Copy image to clipboard"; copyImageButton.innerHTML = `...Copy Image`; copyImageButton.classList.remove('copied'); } // Reset copy button state
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
languageSelect.addEventListener('change', applyCustomizations); // <-- Add listener
themeSelect.addEventListener('change', applyCustomizations);
bgColorPicker.addEventListener('input', applyCustomizations);
paddingSlider.addEventListener('input', applyCustomizations);
fontSizeSlider.addEventListener('input', applyCustomizations);
fontFamilySelect.addEventListener('change', applyCustomizations);

// Copy button listener
copyImageButton.addEventListener('click', copyImageToClipboard);

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    addPondiverseButton();
    applyCustomizations(); // Apply initial default styles
    if (codeInput.value) {
        updatePreviewAndGenerateImage(); // Generate initial preview/image
    } else {
         if(pondiverseButton) pondiverseButton.disabled = true;
         if(copyImageButton) copyImageButton.disabled = true;
    }
});