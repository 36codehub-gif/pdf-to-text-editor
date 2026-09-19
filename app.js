pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const pdfFile = document.getElementById("pdfFile");
const canvas = document.getElementById("pdfCanvas");
const ctx = canvas.getContext("2d");
const textLayer = document.getElementById("textLayer");
const pageContainer = document.getElementById("pageContainer");

const pageInfo = document.getElementById("pageInfo");
const status = document.getElementById("status");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const downloadBtn = document.getElementById("downloadBtn");

const fontSizeInput = document.getElementById("fontSize");
const fontFamily = document.getElementById("fontFamily");

const boldBtn = document.getElementById("boldBtn");
const italicBtn = document.getElementById("italicBtn");
const addTextBtn = document.getElementById("addTextBtn");
const deleteBtn = document.getElementById("deleteBtn");

let pdf = null;
let currentPage = 1;
let totalPages = 0;

const SCALE = 1.5;

let pageItems = {};
let selectedText = null;
let activeEditor = null;

let touchTimer = null;
let lastTouchTime = 0;


/* ================================
   PDF OPEN
================================ */

pdfFile.addEventListener("change", async function () {

    const file = this.files[0];

    if (!file) return;

    try {

        status.textContent = "PDF loading...";

        const buffer = await file.arrayBuffer();

        pdf = await pdfjsLib.getDocument({
            data: buffer
        }).promise;

        totalPages = pdf.numPages;
        currentPage = 1;

        pageItems = {};

        await renderPage(1);

        status.textContent =
            "PDF loaded. Text par double-tap karein.";

    } catch (error) {

        console.error(error);

        status.textContent =
            "PDF load nahi hua.";

    }

});


/* ================================
   RENDER PAGE
================================ */

async function renderPage(pageNumber) {

    if (!pdf) return;

    finishEditing();

    selectedText = null;

    const page = await pdf.getPage(pageNumber);

    const viewport = page.getViewport({
        scale: SCALE
    });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    pageContainer.style.width =
        viewport.width + "px";

    pageContainer.style.height =
        viewport.height + "px";

    textLayer.innerHTML = "";

    await page.render({
        canvasContext: ctx,
        viewport: viewport
    }).promise;

    const content =
        await page.getTextContent();

    if (!pageItems[pageNumber]) {

        pageItems[pageNumber] = [];

        content.items.forEach((item, index) => {

            if (!item.str || !item.str.trim()) {
                return;
            }

            const transform =
                pdfjsLib.Util.transform(
                    viewport.transform,
                    item.transform
                );

            const x = transform[4];

            const y = transform[5];

            const fontSize =
                Math.max(
                    Math.abs(transform[3]),
                    8
                );

            pageItems[pageNumber].push({

                id: index,

                original: item.str,

                text: item.str,

                x: x,

                y: y - fontSize,

                width:
                    Math.max(
                        item.width * SCALE,
                        20
                    ),

                height:
                    fontSize * 1.35,

                fontSize: fontSize,

                fontName:
                    item.fontName || "",

                deleted: false

            });

        });

    }


    /*
       Draw editable text boxes
    */

    pageItems[pageNumber].forEach(item => {

        if (item.deleted) return;

        createTextElement(
            item,
            pageNumber
        );

    });


    pageInfo.textContent =
        `Page ${pageNumber} / ${totalPages}`;

    currentPage = pageNumber;

}


/* ================================
   CREATE TEXT ELEMENT
================================ */

function createTextElement(item, pageNumber) {

    const span =
        document.createElement("div");

    span.className = "pdf-text";

    span.dataset.id = item.id;

    span.textContent = item.text;


    span.style.left =
        item.x + "px";

    span.style.top =
        item.y + "px";

    span.style.width =
        Math.max(item.width, 20) + "px";

    span.style.height =
        item.height + "px";

    span.style.fontSize =
        item.fontSize + "px";


    /*
       IMPORTANT:
       Text transparent rakha hai,
       kyunki original PDF text neeche
       already visible hai.
    */

    span.style.color = "transparent";


    /*
       Touch ko browser ke text-selection
       se interfere nahi karne dete.
    */

    span.style.touchAction = "manipulation";


    /*
       Desktop double click
    */

    span.addEventListener(
        "dblclick",
        function (e) {

            e.preventDefault();
            e.stopPropagation();

            startEditing(
                span,
                item,
                pageNumber
            );

        }
    );


    /*
       Mobile double tap
    */

    span.addEventListener(
        "touchend",
        function (e) {

            e.preventDefault();
            e.stopPropagation();

            const now =
                Date.now();

            const difference =
                now - lastTouchTime;

            if (
                difference > 0 &&
                difference < 450
            ) {

                clearTimeout(touchTimer);

                startEditing(
                    span,
                    item,
                    pageNumber
                );

            } else {

                /*
                   Single tap = select
                */

                selectText(span);

                touchTimer =
                    setTimeout(
                        () => {},
                        450
                    );

            }

            lastTouchTime = now;

        },
        {
            passive: false
        }
    );


    /*
       Normal click
    */

    span.addEventListener(
        "click",
        function (e) {

            e.stopPropagation();

            selectText(span);

        }
    );


    textLayer.appendChild(span);
}


/* ================================
   SELECT TEXT
================================ */

function selectText(element) {

    if (selectedText) {

        selectedText.classList.remove(
            "selected"
        );

    }

    selectedText = element;

    selectedText.classList.add(
        "selected"
    );

    const size =
        parseFloat(
            getComputedStyle(
                element
            ).fontSize
        );

    fontSizeInput.value =
        Math.round(size);

}


/* ================================
   START EDITING
================================ */

function startEditing(
    span,
    item,
    pageNumber
) {

    /*
       Already editing?
    */

    if (activeEditor) {

        finishEditing();

    }


    selectText(span);


    /*
       Create actual input
    */

    const input =
        document.createElement("input");

    input.className =
        "editBox";


    input.type = "text";

    input.value =
        item.text;


    /*
       Position
    */

    input.style.position =
        "absolute";

    input.style.left =
        item.x + "px";

    input.style.top =
        item.y + "px";


    input.style.width =
        Math.max(
            item.width + 40,
            100
        ) + "px";


    input.style.height =
        Math.max(
            item.height + 8,
            30
        ) + "px";


    input.style.fontSize =
        item.fontSize + "px";


    input.style.fontFamily =
        "Arial, sans-serif";


    input.style.color =
        "#000";


    input.style.background =
        "#fff";


    input.style.border =
        "2px solid #2563eb";


    input.style.borderRadius =
        "4px";


    input.style.padding =
        "2px 5px";


    input.style.zIndex =
        "9999";


    /*
       IMPORTANT MOBILE FIX
    */

    input.style.webkitUserSelect =
        "text";

    input.style.userSelect =
        "text";

    input.style.touchAction =
        "manipulation";


    textLayer.appendChild(input);

    activeEditor = {

        input: input,

        span: span,

        item: item,

        page: pageNumber

    };


    /*
       Focus
    */

    setTimeout(() => {

        input.focus();

        input.select();

    }, 50);


    /*
       Enter = save
    */

    input.addEventListener(
        "keydown",
        function (e) {

            if (e.key === "Enter") {

                e.preventDefault();

                saveEditing();

            }

            if (e.key === "Escape") {

                e.preventDefault();

                cancelEditing();

            }

        }
    );


    /*
       Blur = save
    */

    input.addEventListener(
        "blur",
        function () {

            setTimeout(() => {

                if (
                    activeEditor &&
                    activeEditor.input === input
                ) {

                    saveEditing();

                }

            }, 150);

        }
    );

}


/* ================================
   SAVE EDIT
================================ */

function saveEditing() {

    if (!activeEditor) return;

    const editor =
        activeEditor;

    const value =
        editor.input.value;


    /*
       Update object
    */

    editor.item.text =
        value;


    /*
       Update visible text
    */

    editor.span.textContent =
        value;


    /*
       Make changed text visible
       on top of original.
    */

    editor.span.style.color =
        "#000";


    editor.span.style.background =
        "rgba(255,255,255,.95)";


    /*
       Remove input
    */

    editor.input.remove();

    activeEditor = null;


    status.textContent =
        "Text updated ✔";

}


/* ================================
   CANCEL EDIT
================================ */

function cancelEditing() {

    if (!activeEditor) return;

    activeEditor.input.remove();

    activeEditor = null;

}


/* ================================
   FINISH EDITING
================================ */

function finishEditing() {

    if (activeEditor) {

        saveEditing();

    }

}


/* ================================
   FONT SIZE
================================ */

fontSizeInput.addEventListener(
    "change",
    function () {

        if (!selectedText) return;

        const size =
            Number(this.value);

        selectedText.style.fontSize =
            size + "px";

        const id =
            Number(
                selectedText.dataset.id
            );

        const item =
            pageItems[currentPage]
                .find(x => x.id === id);

        if (item) {

            item.fontSize = size;

        }

    }
);


/* ================================
   FONT FAMILY
================================ */

fontFamily.addEventListener(
    "change",
    function () {

        if (!selectedText) return;

        selectedText.style.fontFamily =
            this.value;

    }
);


/* ================================
   BOLD
================================ */

boldBtn.addEventListener(
    "click",
    function () {

        if (!selectedText) return;

        selectedText.style.fontWeight =
            selectedText.style.fontWeight ===
            "bold"
                ? "normal"
                : "bold";

    }
);


/* ================================
   ITALIC
================================ */

italicBtn.addEventListener(
    "click",
    function () {

        if (!selectedText) return;

        selectedText.style.fontStyle =
            selectedText.style.fontStyle ===
            "italic"
                ? "normal"
                : "italic";

    }
);


/* ================================
   DELETE
================================ */

deleteBtn.addEventListener(
    "click",
    function () {

        if (!selectedText) {

            alert(
                "Pehle text par tap karein."
            );

            return;

        }


        const id =
            Number(
                selectedText.dataset.id
            );


        const item =
            pageItems[currentPage]
                .find(x => x.id === id);


        if (item) {

            item.deleted = true;

        }


        selectedText.remove();

        selectedText = null;


        status.textContent =
            "Text deleted.";

    }
);


/* ================================
   ADD TEXT
================================ */

addTextBtn.addEventListener(
    "click",
    function () {

        const id =
            "new-" +
            Date.now();


        const item = {

            id: id,

            original: "",

            text: "New Text",

            x: 100,

            y: 100,

            width: 130,

            height: 30,

            fontSize: 18,

            fontName: "",

            deleted: false,

            added: true

        };


        if (!pageItems[currentPage]) {

            pageItems[currentPage] = [];

        }


        pageItems[currentPage].push(
            item
        );


        const span =
            document.createElement("div");


        span.className =
            "pdf-text selected";


        span.dataset.id =
            id;


        span.textContent =
            "New Text";


        span.style.left =
            item.x + "px";

        span.style.top =
            item.y + "px";

        span.style.width =
            item.width + "px";

        span.style.height =
            item.height + "px";

        span.style.fontSize =
            item.fontSize + "px";

        span.style.color =
            "#000";

        span.style.background =
            "rgba(255,255,255,.9)";


        textLayer.appendChild(
            span
        );


        selectedText =
            span;


        startEditing(
            span,
            item,
            currentPage
        );

    }
);


/* ================================
   PREVIOUS
================================ */

prevBtn.addEventListener(
    "click",
    async function () {

        if (!pdf) return;

        if (currentPage <= 1) return;

        await renderPage(
            currentPage - 1
        );

    }
);


/* ================================
   NEXT
================================ */

nextBtn.addEventListener(
    "click",
    async function () {

        if (!pdf) return;

        if (
            currentPage >= totalPages
        ) return;

        await renderPage(
            currentPage + 1
        );

    }
);


/* ================================
   DOWNLOAD
================================ */

downloadBtn.addEventListener(
    "click",
    async function () {

        if (!pdf) {

            alert(
                "Pehle PDF upload karein."
            );

            return;

        }


        finishEditing();


        status.textContent =
            "PDF preparing...";


        try {

            const {
                jsPDF
            } = window.jspdf;


            let output = null;


            for (
                let pageNumber = 1;
                pageNumber <= totalPages;
                pageNumber++
            ) {

                const page =
                    await pdf.getPage(
                        pageNumber
                    );


                const viewport =
                    page.getViewport({
                        scale: 2
                    });


                const tempCanvas =
                    document.createElement(
                        "canvas"
                    );


                tempCanvas.width =
                    viewport.width;

                tempCanvas.height =
                    viewport.height;


                const tempCtx =
                    tempCanvas.getContext(
                        "2d"
                    );


                await page.render({

                    canvasContext:
                        tempCtx,

                    viewport:
                        viewport

                }).promise;


                const width =
                    viewport.width;

                const height =
                    viewport.height;


                if (!output) {

                    output =
                        new jsPDF({

                            unit: "pt",

                            format: [
                                width / 2,
                                height / 2
                            ],

                            orientation:
                                width > height
                                    ? "landscape"
                                    : "portrait"

                        });

                } else {

                    output.addPage([
                        width / 2,
                        height / 2
                    ]);

                }


                /*
                   Draw changed text
                */

                const items =
                    pageItems[
                        pageNumber
                    ] || [];


                for (const item of items) {

                    if (item.deleted) {

                        /*
                           White rectangle
                           over deleted text
                        */

                        tempCtx.fillStyle =
                            "#ffffff";

                        tempCtx.fillRect(

                            item.x / SCALE * 2,

                            item.y / SCALE * 2,

                            item.width /
                                SCALE * 2,

                            item.height /
                                SCALE * 2

                        );

                        continue;

                    }


                    if (
                        item.text !==
                        item.original
                    ) {

                        const x =
                            item.x /
                            SCALE *
                            2;


                        const y =
                            item.y /
                            SCALE *
                            2;


                        const w =
                            item.width /
                            SCALE *
                            2;


                        const h =
                            item.height /
                            SCALE *
                            2;


                        /*
                           Cover old text
                        */

                        tempCtx.fillStyle =
                            "#ffffff";


                        tempCtx.fillRect(
                            x,
                            y,
                            w,
                            h
                        );


                        /*
                           New text
                        */

                        tempCtx.fillStyle =
                            "#000000";


                        tempCtx.font =
                            `${item.fontSize / SCALE * 2}px Arial`;


                        tempCtx.textBaseline =
                            "top";


                        tempCtx.fillText(
                            item.text,
                            x,
                            y
                        );

                    }

                }


                /*
                   Add final page
                */

                output.addImage(

                    tempCanvas.toDataURL(
                        "image/jpeg",
                        0.95
                    ),

                    "JPEG",

                    0,

                    0,

                    width / 2,

                    height / 2

                );

            }


            /*
               First page is already created
               in jsPDF constructor.
            */

            output.save(
                "edited-pdf.pdf"
            );


            status.textContent =
                "PDF downloaded ✔";

        } catch (error) {

            console.error(error);

            status.textContent =
                "PDF download failed.";

        }

    }
);
