
// ==========================================
// PDF TO TEXT EDITOR
// ==========================================

// HTML elements

const pdfFile = document.getElementById("pdfFile");

const extractBtn = document.getElementById("extractBtn");

const downloadTxtBtn =
    document.getElementById("downloadTxtBtn");

const downloadPdfBtn =
    document.getElementById("downloadPdfBtn");

const clearBtn =
    document.getElementById("clearBtn");

const pdfPreview =
    document.getElementById("pdfPreview");

const textEditor =
    document.getElementById("textEditor");

const wordCount =
    document.getElementById("wordCount");

const charCount =
    document.getElementById("charCount");

const status =
    document.getElementById("status");


// Selected PDF

let selectedFile = null;


// ==========================================
// PDF.js configuration
// ==========================================

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";


// ==========================================
// File Selection
// ==========================================

pdfFile.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) {
        return;
    }

    if (file.type !== "application/pdf") {

        alert("Please select a valid PDF file.");

        pdfFile.value = "";

        return;
    }

    selectedFile = file;

    status.textContent =
        "Selected: " + file.name;

    previewPDF(file);

});


// ==========================================
// PDF Preview
// ==========================================

async function previewPDF(file) {

    pdfPreview.innerHTML = "";

    status.textContent =
        "Loading PDF preview...";

    try {

        const arrayBuffer =
            await file.arrayBuffer();

        const pdf =
            await pdfjsLib.getDocument({
                data: arrayBuffer
            }).promise;


        for (
            let pageNumber = 1;
            pageNumber <= pdf.numPages;
            pageNumber++
        ) {

            const page =
                await pdf.getPage(pageNumber);


            const viewport =
                page.getViewport({
                    scale: 1.2
                });


            const canvas =
                document.createElement("canvas");


            canvas.className =
                "pdf-page";


            const context =
                canvas.getContext("2d");


            canvas.width =
                viewport.width;

            canvas.height =
                viewport.height;


            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;


            pdfPreview.appendChild(canvas);

        }


        status.textContent =
            `${pdf.numPages} page(s) loaded.`;

    }

    catch (error) {

        console.error(error);

        pdfPreview.innerHTML = `
            <div class="empty">
                <div class="empty-icon">⚠️</div>
                <p>Unable to preview this PDF.</p>
            </div>
        `;

        status.textContent =
            "Error loading PDF.";

    }

}


// ==========================================
// Extract PDF Text
// ==========================================

extractBtn.addEventListener(
    "click",
    extractText
);


async function extractText() {

    if (!selectedFile) {

        alert("Please upload a PDF first.");

        return;
    }


    status.textContent =
        "Extracting text...";

    textEditor.value = "";


    try {

        const arrayBuffer =
            await selectedFile.arrayBuffer();


        const pdf =
            await pdfjsLib.getDocument({
                data: arrayBuffer
            }).promise;


        let completeText = "";


        for (
            let pageNumber = 1;
            pageNumber <= pdf.numPages;
            pageNumber++
        ) {

            const page =
                await pdf.getPage(pageNumber);


            const textContent =
                await page.getTextContent();


            const pageText =
                textContent.items
                    .map(item => item.str)
                    .join(" ");


            completeText +=
                `--- Page ${pageNumber} ---\n\n`;

            completeText +=
                pageText.trim();

            completeText +=
                "\n\n";

        }


        textEditor.value =
            completeText.trim();


        updateStats();


        status.textContent =
            "Text extraction completed successfully.";

    }

    catch (error) {

        console.error(error);

        textEditor.value = "";

        status.textContent =
            "Unable to extract text.";

        alert(
            "Text extraction failed. This may be a scanned/image-only PDF."
        );

    }

}


// ==========================================
// Word & Character Count
// ==========================================

textEditor.addEventListener(
    "input",
    updateStats
);


function updateStats() {

    const text =
        textEditor.value.trim();


    // Character count

    charCount.textContent =
        textEditor.value.length;


    // Word count

    if (text === "") {

        wordCount.textContent = "0";

        return;
    }


    const words =
        text.split(/\s+/);


    wordCount.textContent =
        words.length;

}


// ==========================================
// Download TXT
// ==========================================

downloadTxtBtn.addEventListener(
    "click",
    downloadTXT
);


function downloadTXT() {

    const text =
        textEditor.value;


    if (text.trim() === "") {

        alert(
            "There is no text to download."
        );

        return;
    }


    const blob =
        new Blob(
            [text],
            {
                type:
                    "text/plain;charset=utf-8"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;

    link.download =
        "edited-text.txt";


    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);


    URL.revokeObjectURL(url);


    status.textContent =
        "TXT file downloaded.";

}


// ==========================================
// Generate & Download PDF
// ==========================================

downloadPdfBtn.addEventListener(
    "click",
    generatePDF
);


function generatePDF() {

    const text =
        textEditor.value.trim();


    if (text === "") {

        alert(
            "Please extract or enter some text first."
        );

        return;
    }


    // Get jsPDF

    const { jsPDF } =
        window.jspdf;


    // Create A4 PDF

    const pdf =
        new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });


    const pageWidth =
        pdf.internal.pageSize.getWidth();


    const pageHeight =
        pdf.internal.pageSize.getHeight();


    // PDF margins

    const margin = 15;


    const usableWidth =
        pageWidth - (margin * 2);


    const usableHeight =
        pageHeight - (margin * 2);


    // Font

    pdf.setFont("helvetica");

    pdf.setFontSize(12);


    // Convert text into lines

    const lines =
        pdf.splitTextToSize(
            text,
            usableWidth
        );


    const lineHeight = 6;

    let y = margin;


    // Write lines

    for (let i = 0; i < lines.length; i++) {

        // New page when required

        if (
            y + lineHeight >
            pageHeight - margin
        ) {

            pdf.addPage();

            y = margin;

        }


        pdf.text(
            lines[i],
            margin,
            y
        );


        y += lineHeight;

    }


    // Generate file name

    let fileName =
        "edited-pdf.pdf";


    if (selectedFile) {

        const originalName =
            selectedFile.name
                .replace(/\.pdf$/i, "");


        fileName =
            originalName +
            "-edited.pdf";

    }


    // Download

    pdf.save(fileName);


    status.textContent =
        "Edited PDF generated and downloaded successfully.";

}


// ==========================================
// Clear Everything
// ==========================================

clearBtn.addEventListener(
    "click",
    clearAll
);


function clearAll() {

    selectedFile = null;

    pdfFile.value = "";

    textEditor.value = "";

    pdfPreview.innerHTML = `
        <div class="empty">
            <div class="empty-icon">📄</div>
            <p>Select a PDF file to preview it here.</p>
        </div>
    `;


    status.textContent =
        "No PDF selected.";


    updateStats();

}
