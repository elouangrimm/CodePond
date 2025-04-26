const codeInput = document.getElementById("codeInput");
const codePreview = document.getElementById("codePreview");
const codePreviewContainer = document.getElementById("codePreviewContainer");
const outputImageDisplay = document.getElementById("outputImageDisplay");

let generatedImageDataUrl = null;

let debounceTimer;

async function updatePreviewAndGenerateImage() {
    const code = codeInput.value;

    codePreview.textContent = code;

    codePreview.className = "hljs";

    hljs.highlightElement(codePreview);

    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
        const computedStyle = window.getComputedStyle(codePreviewContainer);
        const bgColor = computedStyle.backgroundColor;

        const canvas = await html2canvas(codePreviewContainer, {
            backgroundColor: bgColor || "transparent",
            scale: 2,
            logging: false,
            useCORS: true,
        });

        generatedImageDataUrl = canvas.toDataURL("image/png");

        console.log(
            "Generated Image Data URL (stored in generatedImageDataUrl):",
            generatedImageDataUrl.substring(0, 100) + "..."
        );

        if (generatedImageDataUrl) {
            outputImageDisplay.src = generatedImageDataUrl;
            outputImageDisplay.classList.remove("hidden");
        } else {
            outputImageDisplay.classList.add("hidden");
        }
    } catch (error) {
        console.error("Error generating code image:", error);
        generatedImageDataUrl = null;
        outputImageDisplay.classList.add("hidden");
    }
}

function handleInput() {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
        updatePreviewAndGenerateImage();
    }, 300);
}

codeInput.addEventListener("input", handleInput);