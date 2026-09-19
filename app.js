const pdfFile = document.getElementById("pdfFile");
const extractBtn = document.getElementById("extractBtn");
const clearBtn = document.getElementById("clearBtn");
const downloadBtn = document.getElementById("downloadBtn");

const pdfPreview = document.getElementById("pdfPreview");
const textEditor = document.getElementById("textEditor");
const wordCount = document.getElementById("wordCount");

// Configure PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let selectedFile = null;

// Select PDF
pdfFile.addEventListener("change", function () {

    selectedFile = this.files[0];

    if (!selectedFile) {
        return;
    }

    if (selectedFile.type !== "application/pdf") {
        alert("Please select a PDF file.");
        return;
    }

    previewPDF(selectedFile);
});

// Preview PDF
async function previewPDF(file) {

    pdfPreview.innerHTML = "";

    const fileURL = URL.createObjectURL(file);

    try {

        const pdf = await pdfjsLib.getDocument(fileURL).promise;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {

            const page = await pdf.getPage(pageNumber);

            const viewport = page.getViewport({
                scale: 1.2
            });

            const canvas = document.createElement("canvas");

            canvas.className = "pdf-page";

            const context = canvas.getContext("2d");

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            pdfPreview.appendChild(canvas);
        }

    } catch (error) {

        console.error(error);

        pdfPreview.innerHTML =
            "<p>Unable to display this PDF.</p>";
    }
}

// Extract text
extractBtn.addEventListener("click", async function () {

    if (!selectedFile) {
        alert("Please upload a PDF first.");
        return;
    }

    textEditor.value = "Extracting text...\n\n";

    try {

        const arrayBuffer = await selectedFile.arrayBuffer();

        const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer
        }).promise;

        let completeText = "";

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {

            const page = await pdf.getPage(pageNumber);

            const textContent = await page.getTextContent();

            const pageText = textContent.items
                .map(item => item.str)
                .join(" ");

            completeText +=
                `\n--- Page ${pageNumber} ---\n\n`;

            completeText += pageText + "\n";
        }

        textEditor.value = completeText;

        updateWordCount();

    } catch (error) {

        console.error(error);

        textEditor.value =
            "Error: Could not extract text from this PDF.";
    }
});

// Update word count
textEditor.addEventListener("input", updateWordCount);

function updateWordCount() {

    const text = textEditor.value.trim();

    if (text === "") {
        wordCount.textContent = "0";
        return;
    }

    const words = text.split(/\s+/);

    wordCount.textContent = words.length;
}

// Clear editor
clearBtn.addEventListener("click", function () {

    textEditor.value = "";

    pdfPreview.innerHTML =
        "<p>Select a PDF file to preview it here.</p>";

    pdfFile.value = "";

    selectedFile = null;

    updateWordCount();
});

// Download text
downloadBtn.addEventListener("click", function () {

    const text = textEditor.value;

    if (text.trim() === "") {
        alert("There is no text to download.");
        return;
    }

    const blob = new Blob(
        [text],
        { type: "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "edited-text.txt";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
});
