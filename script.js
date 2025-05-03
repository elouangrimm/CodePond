// --- DOM References ---
const codeInput = document.getElementById("codeInput");
const codePreview = document.getElementById("codePreview");
const codePreviewContainer = document.getElementById("codePreviewContainer");
const outputImageDisplay = document.getElementById("outputImageDisplay");
const pondiverseControlsContainer = document.getElementById(
    "pondiverse-controls"
);
const languageDisplay = document.getElementById("language-display");
const copyImageButton = document.getElementById("copy-image-button");

// Customization Controls
const languageSelect = document.getElementById("language-select");
const themeSelect = document.getElementById("theme-select");
const bgColorPicker = document.getElementById("bg-color-picker");
const paddingSlider = document.getElementById("padding-slider");
const paddingValueDisplay = document.getElementById("padding-value");
const fontSizeSlider = document.getElementById("font-size-slider");
const fontSizeValueDisplay = document.getElementById("font-size-value");
const fontFamilySelect = document.getElementById("font-family-select");
const themeLink = document.getElementById("hljs-theme-link");

// --- State Variables ---
let generatedImageDataUrl = null;
let inputDebounceTimer;
let styleDebounceTimer;
let pondiverseButton = null; // Will hold the button created by addPondiverseButton
let isCopying = false; // Prevent multiple clicks while copying
const LOCAL_STORAGE_KEY = "codePondSnippetCode";

const PONDIVERSE_INSTANCE_URL = "https://pondiverse.val.run";
const DEFAULT_INSTANCE = {
    name: "todepondiverse",
    home: "https://pondiverse.com/",
    addCreation: "https://pondiverse.val.run/add-creation",
    getCreation: "https://pondiverse.val.run/get-creation?id=",
    getCreationImage: "https://pondiverse.val.run/get-creation-image?id=",
    getCreations: "https://pondiverse.val.run/get-creations",
};

// --- Style Customization Logic ---

function updateValueDisplay(slider, display, unit) {
    if (display) {
        // Check if display element exists
        display.textContent = `${slider.value}${unit}`;
    }
}

function applyCustomizations() {
    // Ensure all elements exist before reading values
    if (
        !paddingSlider ||
        !fontSizeSlider ||
        !fontFamilySelect ||
        !bgColorPicker ||
        !themeSelect ||
        !themeLink
    ) {
        console.error(
            "One or more customization control elements are missing."
        );
        return;
    }

    const padding = `${paddingSlider.value}px`;
    const fontSize = `${fontSizeSlider.value}em`;
    const fontFamily = fontFamilySelect.value;
    const bgColor = bgColorPicker.value;
    const selectedTheme = themeSelect.value;

    // Update CSS variables
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--code-padding", padding);
    rootStyle.setProperty("--code-font-size", fontSize);
    rootStyle.setProperty("--code-font-family", fontFamily);
    rootStyle.setProperty("--code-bg-color", bgColor);

    // Update Theme Stylesheet
    const themeBaseUrl =
        "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/";
    themeLink.href = `${themeBaseUrl}${selectedTheme}.min.css`;

    // Update slider value displays
    updateValueDisplay(paddingSlider, paddingValueDisplay, "px");
    updateValueDisplay(fontSizeSlider, fontSizeValueDisplay, "em");

    // Trigger re-highlight and image regeneration
    clearTimeout(styleDebounceTimer);
    styleDebounceTimer = setTimeout(() => {
        updatePreviewAndGenerateImage(); // Make sure this function exists
    }, 250);
}

// --- Code Snippet Generation Logic ---

async function updatePreviewAndGenerateImage() {
    // Ensure necessary elements exist
    if (
        !codeInput ||
        !codePreview ||
        !languageDisplay ||
        !languageSelect ||
        !codePreviewContainer
    ) {
        console.error("Core code preview elements are missing.");
        return;
    }
    if (typeof hljs === "undefined") {
        console.error("highlight.js (hljs) is not loaded.");
        return;
    }

    const code = codeInput.value;
    const selectedLanguage = languageSelect.value;

    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, code);
    } catch (e) {
        console.error("Failed to save code to localStorage:", e);
        // Handle potential errors (e.g., storage full, privacy settings)
    }

    // 1. Highlight code based on selection
    let result;
    let displayLangText;

    try {
        if (code.trim() === "") {
            result = { value: "", language: "plaintext" };
            displayLangText = "Detected: plaintext";
        } else if (selectedLanguage === "auto") {
            result = hljs.highlightAuto(code);
            displayLangText = `Detected: ${result.language || "auto"}`;
        } else {
            if (hljs.getLanguage(selectedLanguage)) {
                result = hljs.highlight(code, {
                    language: selectedLanguage,
                    ignoreIllegals: true,
                }); // Added ignoreIllegals
                displayLangText = `Language: ${selectedLanguage} (Forced)`;
            } else {
                console.warn(
                    `Language "${selectedLanguage}" not recognized by highlight.js. Falling back to auto-detect.`
                );
                result = hljs.highlightAuto(code);
                displayLangText = `Detected: ${
                    result.language || "auto"
                } (Fallback)`;
            }
        }
    } catch (error) {
        console.error(`Error during highlighting:`, error);
        // Fallback to plain text on error
        result = {
            value: codeInput.value.replace(/</g, "<").replace(/>/g, ">"),
            language: "plaintext",
        }; // Basic escaping
        displayLangText = "Highlighting Error";
    }

    languageDisplay.textContent = displayLangText;

    // 2. Update preview content
    codePreview.innerHTML = result.value;
    codePreview.className = `hljs language-${
        result.language || selectedLanguage || "plaintext"
    }`;

    // 3. Small delay for rendering
    await new Promise((resolve) => setTimeout(resolve, 150));

    // 4. Generate image
    if (typeof html2canvas === "undefined") {
        console.error("html2canvas is not loaded.");
        return; // Stop if html2canvas isn't available
    }

    try {
        const canvas = await html2canvas(codePreviewContainer, {
            backgroundColor: null,
            scale: 2,
            logging: false,
            useCORS: true,
            onclone: (clonedDoc) => {
                const clonedThemeLink =
                    clonedDoc.getElementById("hljs-theme-link");
                if (clonedThemeLink && themeLink) {
                    clonedThemeLink.href = themeLink.href;
                }
            },
        });

        generatedImageDataUrl = canvas.toDataURL("image/png");

        // 6. Update display & Enable buttons
        if (outputImageDisplay) {
            if (generatedImageDataUrl) {
                outputImageDisplay.src = generatedImageDataUrl;
                outputImageDisplay.classList.remove("hidden");
            } else {
                outputImageDisplay.classList.add("hidden");
            }
        }

        // Enable buttons only if image generation was successful
        if (generatedImageDataUrl) {
            if (pondiverseButton && pondiverseButton.disabled) {
                pondiverseButton.disabled = false;
                pondiverseButton.textContent = "✶ Share";
                pondiverseButton.title = "Share to Pondiverse";
            }
            if (copyImageButton && copyImageButton.disabled) {
                copyImageButton.disabled = false;
                copyImageButton.title = "Copy image to clipboard";
                copyImageButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: -0.125em; margin-right: 0.4em;">
                        <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                        <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                    </svg>Copy Image`;
                copyImageButton.classList.remove("copied");
            }
        }
    } catch (error) {
        console.error("Error generating code image with html2canvas:", error);
        generatedImageDataUrl = null;
        if (outputImageDisplay) outputImageDisplay.classList.add("hidden");
        // Keep buttons disabled if image generation failed
        if (pondiverseButton) pondiverseButton.disabled = true;
        if (copyImageButton) copyImageButton.disabled = true;
    }
}

// Debounced input handler
function handleInput() {
    clearTimeout(inputDebounceTimer);
    inputDebounceTimer = setTimeout(() => {
        updatePreviewAndGenerateImage();
    }, 350);
}

// Tab Key Handling
function handleTabKey(event) {
    if (event.key === "Tab") {
        event.preventDefault();
        const textarea = event.target;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const tabCharacter = "  "; // Use 2 spaces for tab
        textarea.value =
            textarea.value.substring(0, start) +
            tabCharacter +
            textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd =
            start + tabCharacter.length;
        // Manually trigger input event for debounced update
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }
}

// --- Clipboard Copy Logic ---
async function copyImageToClipboard() {
    if (!generatedImageDataUrl) {
        alert("No image has been generated yet!");
        return;
    }
    if (isCopying) {
        return;
    }
    if (!navigator.clipboard || !navigator.clipboard.write) {
        alert(
            "Clipboard API not supported or not available in this context (try HTTPS)."
        );
        console.error("Clipboard API (write) not available.");
        return;
    }
    // Ensure copy button exists
    if (!copyImageButton) return;

    isCopying = true;
    copyImageButton.disabled = true;
    const originalButtonHTML = copyImageButton.innerHTML;
    copyImageButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-repeat" viewBox="0 0 16 16" style="vertical-align: -0.125em; margin-right: 0.4em; animation: spin 1s linear infinite;">
          <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
          <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.5A.5.5 0 0 1 12 8v.5A.5.5 0 0 1 11.5 9h3a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0V10a5 5 0 0 0-9.192-1.518.5.5 0 1 1 .771.636A4 4 0 0 1 8 3z"/>
        </svg>Copying...`;
    const spinStyle =
        document.getElementById("copy-spin-style") ||
        document.createElement("style");
    if (!spinStyle.id) {
        // Only add if it doesn't exist
        spinStyle.id = "copy-spin-style";
        spinStyle.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
        document.head.appendChild(spinStyle);
    }

    try {
        const response = await fetch(generatedImageDataUrl);
        if (!response.ok)
            throw new Error(
                `Failed to fetch image data: ${response.statusText}`
            );
        const blob = await response.blob();
        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);

        copyImageButton.innerHTML = `
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: -0.125em; margin-right: 0.4em;">
                <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022z"/>
            </svg>Copied!`;
        copyImageButton.classList.add("copied");

        posthog.capture("copied_image"); // posthog analytics

        setTimeout(() => {
            if (
                copyImageButton &&
                copyImageButton.classList.contains("copied")
            ) {
                // Check if still in copied state
                copyImageButton.innerHTML = originalButtonHTML;
                copyImageButton.classList.remove("copied");
                copyImageButton.disabled = false;
                isCopying = false;
                document.getElementById("copy-spin-style")?.remove();
            }
        }, 2000);
    } catch (error) {
        console.error("Failed to copy image:", error);
        alert(
            `Failed to copy image to clipboard. See console for details.\nError: ${error.message}`
        );
        if (copyImageButton) {
            copyImageButton.innerHTML = originalButtonHTML;
            copyImageButton.disabled = false;
        }
        isCopying = false;
        document.getElementById("copy-spin-style")?.remove();
    }
}

// --- Pondiverse Integration Logic ---
function addPondiverseButton() {
    // Ensure container exists
    if (!pondiverseControlsContainer) {
        console.error(
            "Pondiverse controls container (#pondiverse-controls) not found in HTML."
        );
        return;
    }

    pondiverseButton = document.createElement("button");
    pondiverseButton.className = "pondiverse-button"; // Ensure this class exists in CSS
    pondiverseButton.textContent = "✶ Share";
    pondiverseButton.disabled = true; // Start disabled
    pondiverseButton.title =
        "Generate a code snippet image first to enable sharing";

    pondiverseControlsContainer.prepend(pondiverseButton); // Add it before the copy button

    // --- Create and Append Dialog (only once) ---
    let dialog = document.getElementById("pondiverse-dialog");
    if (!dialog) {
        dialog = document.createElement("dialog");
        dialog.id = "pondiverse-dialog";
        dialog.innerHTML = `
        <form method="dialog"> <!-- Use method="dialog" for easier closing -->
          <p>Share your code snippet to the <a href="https://pondiverse.com" target="_blank" rel="noopener noreferrer">Pondiverse</a>?</p>
          <p><em>(Creations auto-delete after 25 hours)</em></p>
          <img id="preview-image" src="" alt="Code Snippet Preview" style="display: none;"> <!-- Start hidden -->
          <label for="pondiverse-name">Title</label>
          <input type="text" id="pondiverse-name" name="name" required autocomplete="off" spellcheck="false" />
          <input type="hidden" name="data" value="" />
          <input type="hidden" name="type" value="" />
          <hgroup class="space">
              <button type="button" value="cancel" class="secondary cancel">Cancel</button> <!-- Use value="cancel" -->
              <button type="submit" value="default" class="submit">Publish</button> <!-- Use value="default" -->
          </hgroup>
        </form>
        `;
        document.body.append(dialog);

        // --- Attach Dialog Listeners (only once when created) ---
        const form = dialog.querySelector("form");
        const previewImage = dialog.querySelector("#preview-image");
        const nameInput = dialog.querySelector("#pondiverse-name");
        const cancelButton = dialog.querySelector("button.cancel");
        // const publishButton = dialog.querySelector("button.submit"); // Referenced within submit handler
        // const hiddenDataInput = dialog.querySelector("input[name='data']"); // Referenced within open handler
        // const hiddenTypeInput = dialog.querySelector("input[name='type']"); // Referenced within open handler

        if (previewImage) {
            previewImage.onerror = () => {
                previewImage.style.display = "none";
                console.warn("Pondiverse preview image failed to load.");
            };
            previewImage.onload = () => {
                previewImage.style.display = "block";
            };
        }
        if (nameInput)
            nameInput.addEventListener("keydown", (e) => {
                e.stopPropagation();
            }); // Prevent closing on Enter in input
        if (cancelButton)
            cancelButton.addEventListener("click", (e) => {
                e.stopPropagation();
                closePondiverseDialog();
            });

        // Close on backdrop click
        dialog.addEventListener("click", (event) => {
            if (event.target === dialog) {
                closePondiverseDialog();
            }
        });

        // Handle form submission
        if (form) {
            form.addEventListener("submit", async (e) => {
                e.preventDefault(); // We handle submission manually

                const publishButton = form.querySelector("button.submit");
                const cancelButton = form.querySelector("button.cancel");
                const hiddenDataInput =
                    form.querySelector("input[name='data']");
                const hiddenTypeInput =
                    form.querySelector("input[name='type']");
                const nameInput = form.querySelector("#pondiverse-name");
                const previewImage = form.querySelector("#preview-image");

                // Ensure elements exist before accessing properties
                if (
                    !publishButton ||
                    !cancelButton ||
                    !hiddenDataInput ||
                    !hiddenTypeInput ||
                    !nameInput ||
                    !previewImage
                ) {
                    console.error(
                        "Could not find all necessary elements within the Pondiverse dialog form."
                    );
                    alert("Dialog error. Cannot submit.");
                    return;
                }

                const request = {
                    title: nameInput.value,
                    data: hiddenDataInput.value,
                    type: hiddenTypeInput.value,
                    image: previewImage.src,
                };

                publishButton.disabled = true;
                publishButton.textContent = "Publishing...";
                publishButton.style.cursor = "not-allowed";
                cancelButton.disabled = true;

                try {
                    const response = await fetch(
                        new URL("/add-creation", PONDIVERSE_INSTANCE_URL),
                        {
                            method: "POST",
                            body: JSON.stringify(request),
                        }
                    );

                    if (response.ok) {
                        posthog.capture("sent_to_pondiverse"); // posthog analytics
                        closePondiverseDialog(); // Close on success
                    } else {
                        const errorText = await response.text();
                        console.error(
                            "Pondiverse upload failed:",
                            response.status,
                            errorText
                        );
                        alert(
                            `Upload failed (${
                                response.status
                            }): ${errorText.substring(0, 100)}...`
                        );
                        // Re-enable buttons on failure
                        publishButton.disabled = false;
                        publishButton.textContent = "Publish";
                        publishButton.style.cursor = "pointer";
                        cancelButton.disabled = false;
                    }
                } catch (error) {
                    console.error("Error during Pondiverse fetch:", error);
                    alert(
                        `An error occurred while publishing. Check the console.\nError: ${error.message}`
                    );
                    // Re-enable buttons on fetch error
                    publishButton.disabled = false;
                    publishButton.textContent = "Publish";
                    publishButton.style.cursor = "pointer";
                    cancelButton.disabled = false;
                }
            });
        }
    } // end if (!dialog)

    // Attach click listener to the button itself
    if (pondiverseButton) {
        pondiverseButton.addEventListener("click", (e) => {
            e.stopPropagation();
            if (!pondiverseButton.disabled) {
                openPondiverseDialog();
            }
        });
    }
}

function openPondiverseDialog() {
    const dialog = document.getElementById("pondiverse-dialog");
    if (!dialog) {
        console.error("Pondiverse dialog not found.");
        return;
    }

    // Ensure getPondiverseCreation function exists on window
    if (typeof window.getPondiverseCreation !== "function") {
        console.error("window.getPondiverseCreation() is not defined.");
        alert("Error: Cannot get creation data.");
        return;
    }
    const creation = window.getPondiverseCreation();

    if (!creation || !creation.image) {
        alert("Please generate the code snippet image first (type some code).");
        console.warn(
            "Cannot open Pondiverse dialog: Image data not available."
        );
        return;
    }

    // Get dialog elements *after* ensuring dialog exists
    const previewImage = dialog.querySelector("#preview-image");
    const nameInput = dialog.querySelector("#pondiverse-name");
    const hiddenDataInput = dialog.querySelector("input[name='data']");
    const hiddenTypeInput = dialog.querySelector("input[name='type']");
    const publishButton = dialog.querySelector("button.submit");
    const cancelButton = dialog.querySelector("button.cancel");

    // Ensure elements exist before using them
    if (
        !previewImage ||
        !nameInput ||
        !hiddenDataInput ||
        !hiddenTypeInput ||
        !publishButton ||
        !cancelButton
    ) {
        console.error(
            "Could not find all necessary elements within the Pondiverse dialog."
        );
        alert("Dialog error. Cannot open.");
        return;
    }

    previewImage.src = creation.image || "";
    previewImage.style.display = creation.image ? "block" : "none";
    hiddenDataInput.value = creation.data || "";
    hiddenTypeInput.value = creation.type || "CodePond";
    nameInput.value = ""; // Clear previous title
    publishButton.disabled = false;
    publishButton.textContent = "Publish";
    publishButton.style.cursor = "pointer";
    cancelButton.disabled = false;

    dialog.showModal();
    nameInput.focus();
}

function closePondiverseDialog() {
    const dialog = document.getElementById("pondiverse-dialog");
    if (dialog && dialog.open) {
        // Check if it's actually open
        dialog.close();
        // Reset button states inside dialog manually if needed when closing via backdrop/ESC
        const publishButton = dialog.querySelector("button.submit");
        const cancelButton = dialog.querySelector("button.cancel");
        if (publishButton) {
            publishButton.disabled = false;
            publishButton.textContent = "Publish";
            publishButton.style.cursor = "pointer";
        }
        if (cancelButton) cancelButton.disabled = false;
    }
}

// Define the function needed by Pondiverse logic
window.getPondiverseCreation = function () {
    // Ensure necessary elements exist before accessing value
    const code = codeInput ? codeInput.value : "";
    return {
        type: "CodePond",
        data: code,
        image: generatedImageDataUrl, // Use the globally stored image URL
    };
};

async function fetchPondiverseCreation(
    id,
    { instance = DEFAULT_INSTANCE } = {}
) {
    if (id === undefined || id === null) {
        throw new Error("You need to provide an id to fetch a creation");
    }
    let url = instance.getCreation + id;
    const idNumber = parseInt(id);
    if (isNaN(idNumber)) {
        if (!id.startsWith("http") && !id.startsWith("localhost")) {
            throw new Error(
                "You need to provide a valid id or a URL to fetch a creation"
            );
        }
        url = id;
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(response.statusText);
    }
    return await response.json();
}

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    if (typeof hljs === "undefined") {
        console.error(
            "FATAL: highlight.js (hljs) failed to load before DOMContentLoaded!"
        );
        alert(
            "Error: Syntax highlighter failed to load. Please refresh the page or check your connection."
        );
        // Optionally disable features that depend on hljs
        if (languageSelect) languageSelect.disabled = true;
        if (themeSelect) themeSelect.disabled = true;
        return; // Stop initialization if hljs isn't ready
    }
    if (typeof html2canvas === "undefined") {
        console.error(
            "FATAL: html2canvas failed to load before DOMContentLoaded!"
        );
        alert(
            "Error: Image generator failed to load. Please refresh the page or check your connection."
        );
        // Optionally disable features that depend on it
        if (copyImageButton) copyImageButton.disabled = true;
        if (pondiverseButton) pondiverseButton.disabled = true; // Make sure pondiverseButton exists
        return; // Stop initialization
    }

    if (codeInput) {
        try {
            const savedCode = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedCode !== null) {
                // Check explicitly for null
                codeInput.value = savedCode;
            } else {
            }
        } catch (e) {
            console.error("Failed to load code from localStorage:", e);
        }
    }

    const urlSearchParams = new URLSearchParams(window.location.search);
    const pondiverseCreationId = urlSearchParams.get("creation");
    if (pondiverseCreationId) {
        fetchPondiverseCreation(pondiverseCreationId).then((creation) => {
            codeInput.value = creation.data;
        });
    } else {
        const savedCode = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedCode !== null) {
            codeInput.value = savedCode;
        } else {
        }
    }

    // Check if elements exist before adding listeners
    if (codeInput) {
        codeInput.addEventListener("input", handleInput);
        codeInput.addEventListener("keydown", handleTabKey);
    } else {
        console.error("#codeInput not found.");
    }

    if (languageSelect)
        languageSelect.addEventListener("change", applyCustomizations);
    else {
        console.error("#language-select not found.");
    }
    if (themeSelect)
        themeSelect.addEventListener("change", applyCustomizations);
    else {
        console.error("#theme-select not found.");
    }
    if (bgColorPicker)
        bgColorPicker.addEventListener("input", applyCustomizations);
    else {
        console.error("#bg-color-picker not found.");
    }
    if (paddingSlider)
        paddingSlider.addEventListener("input", applyCustomizations);
    else {
        console.error("#padding-slider not found.");
    }
    if (fontSizeSlider)
        fontSizeSlider.addEventListener("input", applyCustomizations);
    else {
        console.error("#font-size-slider not found.");
    }
    if (fontFamilySelect)
        fontFamilySelect.addEventListener("change", applyCustomizations);
    else {
        console.error("#font-family-select not found.");
    }
    if (copyImageButton)
        copyImageButton.addEventListener("click", copyImageToClipboard);
    else {
        console.error("#copy-image-button not found.");
    }

    // --- Initialization ---
    addPondiverseButton(); // Create the share button and dialog structure
    applyCustomizations(); // Apply initial default styles from controls

    // Generate initial preview ONLY if code exists
    if (codeInput && codeInput.value) {
        updatePreviewAndGenerateImage();
    } else {
        // Explicitly disable buttons if no initial code
        if (pondiverseButton) pondiverseButton.disabled = true;
        if (copyImageButton) copyImageButton.disabled = true;
    }
});
