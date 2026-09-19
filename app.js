// ============================================
// PDF VISUAL EDITOR
// ============================================

const pdfInput =
    document.getElementById("pdfInput");

const imageInput =
    document.getElementById("imageInput");

const addTextBtn =
    document.getElementById("addText");

const deleteBtn =
    document.getElementById("deleteObject");

const downloadBtn =
    document.getElementById("downloadPdf");

const prevBtn =
    document.getElementById("prevPage");

const nextBtn =
    document.getElementById("nextPage");

const pageInfo =
    document.getElementById("pageInfo");

const message =
    document.getElementById("message");

const textValue =
    document.getElementById("textValue");

const fontSize =
    document.getElementById("fontSize");

const boldBtn =
    document.getElementById("boldBtn");

const italicBtn =
    document.getElementById("italicBtn");


// ============================================
// PDF.js setup
// ============================================

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";


// ============================================
// Fabric Canvas
// ============================================

const canvas =
    new fabric.Canvas(
        "editorCanvas",
        {
            preserveObjectStacking: true,

            selection: true
        }
    );


// ============================================
// Variables
// ============================================

let pdfDocument = null;

let currentPage = 1;

let totalPages = 0;

let originalPdfBytes = null;

let pageData = {};

let pageWidth = 595;

let pageHeight = 842;


// ============================================
// Upload PDF
// ============================================

pdfInput.addEventListener(
    "change",
    async function () {

        const file = this.files[0];

        if (!file) return;

        if (file.type !== "application/pdf") {

            alert(
                "Please select a PDF file."
            );

            return;
        }

        message.textContent =
            "Loading PDF...";

        try {

            originalPdfBytes =
                await file.arrayBuffer();

            pdfDocument =
                await pdfjsLib.getDocument({
                    data: originalPdfBytes
                }).promise;

            totalPages =
                pdfDocument.numPages;

            currentPage = 1;

            pageData = {};

            await loadPage(currentPage);

            message.textContent =
                "PDF loaded. Select an object to edit it.";

        } catch (error) {

            console.error(error);

            message.textContent =
                "Could not load PDF.";

        }

    }
);


// ============================================
// Load PDF Page
// ============================================

async function loadPage(pageNumber) {

    if (!pdfDocument) return;


    // Save current page objects

    saveCurrentPage();


    const page =
        await pdfDocument.getPage(
            pageNumber
        );


    const viewport =
        page.getViewport({
            scale: 1
        });


    pageWidth =
        viewport.width;

    pageHeight =
        viewport.height;


    // Render page to temporary canvas

    const tempCanvas =
        document.createElement("canvas");


    tempCanvas.width =
        viewport.width;

    tempCanvas.height =
        viewport.height;


    const context =
        tempCanvas.getContext("2d");


    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;


    // Set Fabric canvas size

    canvas.setWidth(
        viewport.width
    );

    canvas.setHeight(
        viewport.height
    );


    // Clear Fabric canvas

    canvas.clear();


    // Set PDF page as background

    const image =
        new fabric.Image(
            tempCanvas,
            {
                selectable: false,
                evented: false,

                left: 0,
                top: 0,

                originX: "left",
                originY: "top"
            }
        );


    canvas.setBackgroundImage(
        image,
        canvas.renderAll.bind(canvas)
    );


    // Restore objects

    if (pageData[pageNumber]) {

        pageData[pageNumber]
            .forEach(objectData => {

                fabric.util.enlivenObjects(
                    [objectData],
                    objects => {

                        objects.forEach(obj => {
                            canvas.add(obj);
                        });

                        canvas.renderAll();

                    }
                );

            });

    }


    currentPage =
        pageNumber;


    updatePageInfo();

}


// ============================================
// Save page objects
// ============================================

function saveCurrentPage() {

    if (!pdfDocument) return;


    const objects =
        canvas.getObjects();


    pageData[currentPage] =
        objects.map(
            object => object.toObject()
        );

}


// ============================================
// Page information
// ============================================

function updatePageInfo() {

    pageInfo.textContent =
        `Page ${currentPage} / ${totalPages}`;

}


// ============================================
// Previous Page
// ============================================

prevBtn.addEventListener(
    "click",
    async function () {

        if (
            !pdfDocument ||
            currentPage <= 1
        ) {
            return;
        }

        await loadPage(
            currentPage - 1
        );

    }
);


// ============================================
// Next Page
// ============================================

nextBtn.addEventListener(
    "click",
    async function () {

        if (
            !pdfDocument ||
            currentPage >= totalPages
        ) {
            return;
        }

        await loadPage(
            currentPage + 1
        );

    }
);


// ============================================
// Add Text
// ============================================

addTextBtn.addEventListener(
    "click",
    function () {

        const text =
            new fabric.IText(
                "Edit this text",
                {
                    left: 80,
                    top: 80,

                    fontSize: 18,

                    fill: "#000000",

                    fontFamily:
                        "Arial",

                    editable: true
                }
            );


        canvas.add(text);

        canvas.setActiveObject(text);

        text.enterEditing();

        text.selectAll();

        canvas.renderAll();

    }
);


// ============================================
// Text input property
// ============================================

textValue.addEventListener(
    "input",
    function () {

        const object =
            canvas.getActiveObject();


        if (
            object &&
            (
                object.type === "i-text" ||
                object.type === "text"
            )
        ) {

            object.set(
                "text",
                textValue.value
            );

            canvas.renderAll();

        }

    }
);


// ============================================
// Font Size
// ============================================

fontSize.addEventListener(
    "input",
    function () {

        const object =
            canvas.getActiveObject();


        if (
            object &&
            (
                object.type === "i-text" ||
                object.type === "text"
            )
        ) {

            object.set(
                "fontSize",
                Number(fontSize.value)
            );

            canvas.renderAll();

        }

    }
);


// ============================================
// Selection changed
// ============================================

canvas.on(
    "selection:created",
    updateProperties
);

canvas.on(
    "selection:updated",
    updateProperties
);


function updateProperties() {

    const object =
        canvas.getActiveObject();


    if (!object) return;


    if (
        object.type === "i-text" ||
        object.type === "text"
    ) {

        textValue.value =
            object.text || "";

        fontSize.value =
            object.fontSize || 18;

    }

}


// ============================================
// Bold
// ============================================

boldBtn.addEventListener(
    "click",
    function () {

        const object =
            canvas.getActiveObject();


        if (!object) return;


        if (
            object.type === "i-text" ||
            object.type === "text"
        ) {

            object.set(
                "fontWeight",
                object.fontWeight === "bold"
                    ? "normal"
                    : "bold"
            );

            canvas.renderAll();

        }

    }
);


// ============================================
// Italic
// ============================================

italicBtn.addEventListener(
    "click",
    function () {

        const object =
            canvas.getActiveObject();


        if (!object) return;


        if (
            object.type === "i-text" ||
            object.type === "text"
        ) {

            object.set(
                "fontStyle",
                object.fontStyle === "italic"
                    ? "normal"
                    : "italic"
            );

            canvas.renderAll();

        }

    }
);


// ============================================
// Delete object
// ============================================

deleteBtn.addEventListener(
    "click",
    function () {

        const object =
            canvas.getActiveObject();


        if (!object) {

            alert(
                "Please select an object first."
            );

            return;
        }


        canvas.remove(object);

        canvas.discardActiveObject();

        canvas.renderAll();

    }
);


// ============================================
// Keyboard Delete
// ============================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key !== "Delete" &&
            event.key !== "Backspace"
        ) {
            return;
        }


        const object =
            canvas.getActiveObject();


        if (!object) return;


        if (object.isEditing) {
            return;
        }


        canvas.remove(object);

        canvas.discardActiveObject();

        canvas.renderAll();

    }
);


// ============================================
// Add Image
// ============================================

imageInput.addEventListener(
    "change",
    function () {

        const file =
            this.files[0];


        if (!file) return;


        const reader =
            new FileReader();


        reader.onload =
            function (event) {

                fabric.Image.fromURL(
                    event.target.result,
                    function (img) {

                        img.set({
                            left: 100,
                            top: 100
                        });


                        // Resize large image

                        const maxWidth =
                            200;


                        if (
                            img.width >
                            maxWidth
                        ) {

                            img.scaleToWidth(
                                maxWidth
                            );

                        }


                        canvas.add(img);

                        canvas.setActiveObject(
                            img
                        );

                        canvas.renderAll();

                    }
                );

            };


        reader.readAsDataURL(file);

        this.value = "";

    }
);


// ============================================
// Download Edited PDF
// ============================================

downloadBtn.addEventListener(
    "click",
    async function () {

        if (!pdfDocument) {

            alert(
                "Please upload a PDF first."
            );

            return;
        }


        // Save current page

        saveCurrentPage();


        message.textContent =
            "Generating edited PDF...";


        try {

            const {
                jsPDF
            } = window.jspdf;


            const outputPdf =
                new jsPDF({
                    orientation:
                        pageWidth > pageHeight
                            ? "landscape"
                            : "portrait",

                    unit: "pt",

                    format: [
                        pageWidth,
                        pageHeight
                    ]
                });


            for (
                let pageNumber = 1;
                pageNumber <= totalPages;
                pageNumber++
            ) {

                if (pageNumber > 1) {

                    outputPdf.addPage(
                        [
                            pageWidth,
                            pageHeight
                        ]
                    );

                }


                // Load original page

                const page =
                    await pdfDocument.getPage(
                        pageNumber
                    );


                const viewport =
                    page.getViewport({
                        scale: 1
                    });


                // Render original PDF page

                const tempCanvas =
                    document.createElement(
                        "canvas"
                    );


                tempCanvas.width =
                    viewport.width;

                tempCanvas.height =
                    viewport.height;


                await page.render({
                    canvasContext:
                        tempCanvas.getContext(
                            "2d"
                        ),

                    viewport:
                        viewport
                }).promise;


                const backgroundImage =
                    tempCanvas.toDataURL(
                        "image/png"
                    );


                // Add original page

                outputPdf.addImage(
                    backgroundImage,
                    "PNG",
                    0,
                    0,
                    pageWidth,
                    pageHeight
                );


                // Add edited objects

                const objects =
                    pageData[pageNumber] || [];


                for (
                    const objectData of objects
                ) {

                    await addObjectToPDF(
                        outputPdf,
                        objectData
                    );

                }

            }


            outputPdf.save(
                "edited-pdf.pdf"
            );


            message.textContent =
                "Edited PDF downloaded successfully.";

        }

        catch (error) {

            console.error(error);

            message.textContent =
                "Error generating PDF.";

            alert(
                "Could not generate PDF."
            );

        }

    }
);


// ============================================
// Add Fabric object to jsPDF
// ============================================

async function addObjectToPDF(
    pdf,
    object
) {

    const scaleX =
        object.scaleX || 1;

    const scaleY =
        object.scaleY || 1;


    // TEXT

    if (
        object.type === "i-text" ||
        object.type === "text"
    ) {

        const fontSize =
            (object.fontSize || 18)
            * scaleX;


        let fontStyle =
            "normal";


        if (
            object.fontWeight === "bold" &&
            object.fontStyle === "italic"
        ) {

            fontStyle =
                "bolditalic";

        }

        else if (
            object.fontWeight === "bold"
        ) {

            fontStyle =
                "bold";

        }

        else if (
            object.fontStyle === "italic"
        ) {

            fontStyle =
                "italic";

        }


        pdf.setFont(
            "helvetica",
            fontStyle
        );


        pdf.setFontSize(
            fontSize
        );


        pdf.setTextColor(
            hexToRgb(object.fill || "#000000")
        );


        const x =
            object.left || 0;


        const y =
            object.top || 0;


        const text =
            object.text || "";


        pdf.text(
            text,
            x,
            y + fontSize
        );


        return;
    }


    // IMAGE

    if (
        object.type === "image" &&
        object.src
    ) {

        const width =
            (object.width || 0) *
            scaleX;


        const height =
            (object.height || 0) *
            scaleY;


        pdf.addImage(
            object.src,
            "PNG",
            object.left || 0,
            object.top || 0,
            width,
            height
        );

    }

}


// ============================================
// HEX color → RGB
// ============================================

function hexToRgb(hex) {

    hex =
        hex.replace(
            "#",
            ""
        );


    if (hex.length === 3) {

        hex =
            hex
                .split("")
                .map(
                    x => x + x
                )
                .join("");

    }


    return [
        parseInt(
            hex.substring(0, 2),
            16
        ),

        parseInt(
            hex.substring(2, 4),
            16
        ),

        parseInt(
            hex.substring(4, 6),
            16
        )
    ];

}
