const codeInput = document.getElementById('codeInput');
const codePreview = document.getElementById('codePreview');
const codePreviewContainer = document.getElementById('codePreviewContainer');
const outputImageDisplay = document.getElementById('outputImageDisplay');
const pondiverseControlsContainer = document.getElementById('pondiverse-controls'); 

let generatedImageDataUrl = null; 
let debounceTimer;
let pondiverseButton = null; 

async function updatePreviewAndGenerateImage() {
    const code = codeInput.value;

    codePreview.textContent = code;

    codePreview.className = 'hljs'; 
    hljs.highlightElement(codePreview);

    await new Promise(resolve => setTimeout(resolve, 100)); 

    try {
        const computedStyle = window.getComputedStyle(codePreviewContainer);
        const bgColor = computedStyle.backgroundColor;

        const canvas = await html2canvas(codePreviewContainer, {
            backgroundColor: bgColor || 'transparent',
            scale: 2, 
            logging: false,
            useCORS: true,
        });

        generatedImageDataUrl = canvas.toDataURL('image/png');

        if (outputImageDisplay) {
            if (generatedImageDataUrl) {
                outputImageDisplay.src = generatedImageDataUrl;
                outputImageDisplay.classList.remove('hidden');
            } else {
                outputImageDisplay.classList.add('hidden');
            }
        }

        if (pondiverseButton && pondiverseButton.disabled) {
            pondiverseButton.disabled = false;
             pondiverseButton.textContent = "✶ Share"; 
        }

    } catch (error) {
        console.error("Error generating code image:", error);
        generatedImageDataUrl = null; 
        if (outputImageDisplay) outputImageDisplay.classList.add('hidden');

    }
}

function handleInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        updatePreviewAndGenerateImage();
    }, 350); 
}

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
    <form method="dialog"> <!-- Use method="dialog" for native closing -->
      <p>Share your code snippet to the <a href="https://pondiverse.com" target="_blank" rel="noopener noreferrer">Pondiverse</a>?</p>
      <p><em>(Creations auto-delete after 25 hours)</em></p>
      <img id="preview-image" src="" alt="Code Snippet Preview">
      <label for="pondiverse-name">Title</label>
      <input type="text" id="pondiverse-name" name="name" required autocomplete="off" spellcheck="false" />
      <!-- Hidden fields are set when opening the dialog -->
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

    previewImage.onerror = () => {
        previewImage.style.display = "none"; 
        console.warn("Pondiverse preview image failed to load.");
    };
    previewImage.onload = () => {
        previewImage.style.display = "block"; 
    };

    nameInput.addEventListener("keydown", (e) => { e.stopPropagation(); });

    cancelButton.addEventListener("click", (e) => {
        e.stopPropagation();
        closePondiverseDialog();
    });

     dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
           closePondiverseDialog();
        }
     });

    form.addEventListener("submit", async (e) => {
        e.preventDefault(); 

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
                "https://todepond--e03ca2bc21bb11f094e3569c3dd06744.web.val.run", 
                {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(request),
                }
            );

            if (response.ok) {
                console.log("Successfully published to Pondiverse!");
                closePondiverseDialog();

            } else {
                console.error("Pondiverse upload failed:", response.status, await response.text());
                alert(`Upload failed (${response.status}). Please try again.`);

                 publishButton.disabled = false;
                 publishButton.textContent = "Publish";
                 publishButton.style.cursor = "pointer";
                 cancelButton.disabled = false;
            }
        } catch (error) {
             console.error("Error during Pondiverse fetch:", error);
             alert("An error occurred while publishing. Check the console.");

             publishButton.disabled = false;
             publishButton.textContent = "Publish";
             publishButton.style.cursor = "pointer";
             cancelButton.disabled = false;
        }
    });

    pondiverseButton.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!pondiverseButton.disabled) { 
             openPondiverseDialog();
        }
    });
}

function openPondiverseDialog() {
    const dialog = document.getElementById("pondiverse-dialog");
    if (!dialog) {
        console.error("Pondiverse dialog not found.");
        return;
    }

    const creation = window.getPondiverseCreation();

    if (!creation || !creation.image) {
         alert("Please generate the code snippet image first by typing some code.");

         console.warn("Cannot open Pondiverse dialog: Image data not available.");
         return; 
    }

    const previewImage = dialog.querySelector("#preview-image");
    const nameInput = dialog.querySelector("#pondiverse-name");
    const hiddenDataInput = dialog.querySelector("input[name='data']");
    const hiddenTypeInput = dialog.querySelector("input[name='type']");
    const publishButton = dialog.querySelector("button.submit");
    const cancelButton = dialog.querySelector("button.cancel");

    previewImage.src = creation.image || ""; 
    previewImage.style.display = creation.image ? 'block' : 'none'; 

    hiddenDataInput.value = creation.data || "";
    hiddenTypeInput.value = creation.type || "CodePond"; 

    nameInput.value = ""; 
    publishButton.disabled = false;
    publishButton.textContent = "Publish";
    publishButton.style.cursor = "pointer";
    cancelButton.disabled = false;

    dialog.showModal();
    nameInput.focus(); 
}

function closePondiverseDialog() {
    const dialog = document.getElementById("pondiverse-dialog");
    if (dialog) {
        dialog.close();

    }
}

window.getPondiverseCreation = function() {

    return {
        type: "CodePond", 
        data: codeInput.value, 
        image: generatedImageDataUrl 
    };
};

codeInput.addEventListener('input', handleInput);

document.addEventListener('DOMContentLoaded', () => {
    addPondiverseButton(); 

});