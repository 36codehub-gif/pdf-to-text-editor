pdfjsLib.GlobalWorkerOptions.workerSrc =
"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";


const pdfFile =
document.getElementById("pdfFile");

const canvas =
document.getElementById("pdfCanvas");

const ctx =
canvas.getContext("2d");

const textLayer =
document.getElementById("textLayer");

const pageContainer =
document.getElementById("pageContainer");

const pageInfo =
document.getElementById("pageInfo");

const status =
document.getElementById("status");

const prevBtn =
document.getElementById("prevBtn");

const nextBtn =
document.getElementById("nextBtn");

const downloadBtn =
document.getElementById("downloadBtn");

const fontSizeInput =
document.getElementById("fontSize");

const fontFamily =
document.getElementById("fontFamily");

const boldBtn =
document.getElementById("boldBtn");

const italicBtn =
document.getElementById("italicBtn");

const addTextBtn =
document.getElementById("addTextBtn");

const deleteBtn =
document.getElementById("deleteBtn");


let pdf = null;

let currentPage = 1;

let totalPages = 0;

let scale = 1.5;


/*
    Original PDF text data.

    We keep edited text separately.
*/

let pageData = {};

let selectedText = null;

let editingInput = null;


/*
==================================================
UPLOAD
==================================================
*/

pdfFile.addEventListener(
"change",
async function(){

    const file = this.files[0];

    if(!file) return;

    try{

        status.textContent =
        "Opening PDF...";

        const buffer =
        await file.arrayBuffer();

        pdf =
        await pdfjsLib.getDocument({
            data: buffer
        }).promise;

        totalPages =
        pdf.numPages;

        currentPage = 1;

        pageData = {};

        await renderPage(currentPage);

        status.textContent =
        "PDF loaded. Double-click text to edit.";

    }
    catch(error){

        console.error(error);

        status.textContent =
        "PDF open failed.";

    }

});


/*
==================================================
RENDER PAGE
==================================================
*/

async function renderPage(pageNumber){

    if(!pdf) return;


    const page =
    await pdf.getPage(pageNumber);


    const viewport =
    page.getViewport({
        scale: scale
    });


    canvas.width =
    viewport.width;

    canvas.height =
    viewport.height;


    pageContainer.style.width =
    viewport.width + "px";

    pageContainer.style.height =
    viewport.height + "px";


    textLayer.innerHTML = "";


    /*
        Render original PDF
    */

    await page.render({

        canvasContext: ctx,

        viewport: viewport

    }).promise;


    /*
        Extract text
    */

    const content =
    await page.getTextContent();


    const saved =
    pageData[pageNumber] || [];


    content.items.forEach(
    (item,index)=>{

        const tx =
        pdfjsLib.Util.transform(
            viewport.transform,
            item.transform
        );


        const x =
        tx[4];


        const y =
        tx[5];


        /*
            PDF text height
        */

        const fontHeight =
        Math.sqrt(
            tx[2] * tx[2] +
            tx[3] * tx[3]
        );


        /*
            Edited value if available
        */

        const existing =
        saved[index];


        const text =
        existing
        ? existing.text
        : item.str;


        if(!text.trim()) return;


        const span =
        document.createElement("span");


        span.className =
        "pdf-text";


        span.textContent =
        text;


        span.dataset.index =
        index;


        span.dataset.original =
        item.str;


        /*
            Position
        */

        span.style.left =
        x + "px";


        span.style.top =
        (y - fontHeight) + "px";


        span.style.fontSize =
        fontHeight + "px";


        /*
            Approximate width
        */

        span.style.width =
        Math.max(
            item.width * scale,
            20
        ) + "px";


        span.style.height =
        fontHeight * 1.3 + "px";


        /*
            Transparent text because
            original PDF is underneath.
        */

        span.style.color =
        "transparent";


        /*
            Double click
        */

        span.addEventListener(
        "dblclick",
        function(event){

            event.stopPropagation();

            startEditing(
                span,
                pageNumber,
                index,
                item
            );

        });


        /*
            Single click
        */

        span.addEventListener(
        "click",
        function(event){

            event.stopPropagation();

            selectText(span);

        });


        textLayer.appendChild(span);

    });


    pageInfo.textContent =
    `Page ${pageNumber} / ${totalPages}`;

    currentPage =
    pageNumber;

}


/*
==================================================
SELECT TEXT
==================================================
*/

function selectText(element){

    if(selectedText){

        selectedText.classList.remove(
            "selected"
        );

    }


    selectedText =
    element;


    selectedText.classList.add(
        "selected"
    );


    /*
        Read approximate font size
    */

    const size =
    parseFloat(
        getComputedStyle(
            element
        ).fontSize
    );


    fontSizeInput.value =
    Math.round(size);

}


/*
==================================================
EDIT EXISTING TEXT
==================================================
*/

function startEditing(
    span,
    pageNumber,
    index,
    originalItem
){

    /*
        Don't create multiple inputs
    */

    finishEditing();


    selectText(span);


    const input =
    document.createElement(
        "input"
    );


    input.className =
    "editBox";


    input.value =
    span.textContent;


    /*
        Same approximate font size
    */

    input.style.fontSize =
    getComputedStyle(
        span
    ).fontSize;


    input.style.fontFamily =
    "Arial";


    input.style.left =
    span.offsetLeft + "px";


    input.style.top =
    span.offsetTop + "px";


    input.style.width =
    Math.max(
        span.offsetWidth + 30,
        100
    ) + "px";


    input.style.height =
    Math.max(
        span.offsetHeight + 6,
        25
    ) + "px";


    textLayer.appendChild(
        input
    );


    editingInput =
    input;


    input.focus();

    input.select();


    /*
        Save on Enter
    */

    input.addEventListener(
    "keydown",
    function(event){

        if(event.key === "Enter"){

            finishEditing(
                pageNumber,
                index,
                span
            );

        }


        if(event.key === "Escape"){

            cancelEditing();

        }

    });


    /*
        Save when clicked elsewhere
    */

    input.addEventListener(
    "blur",
    function(){

        setTimeout(
        function(){

            if(
                editingInput === input
            ){

                finishEditing(
                    pageNumber,
                    index,
                    span
                );

            }

        },100);

    });

}


/*
==================================================
FINISH EDITING
==================================================
*/

function finishEditing(
    pageNumber,
    index,
    span
){

    if(!editingInput) return;


    const newText =
    editingInput.value;


    /*
        Store edit
    */

    if(!pageData[pageNumber]){

        pageData[pageNumber] = [];

    }


    pageData[pageNumber][index] = {

        text:newText

    };


    /*
        Update screen
    */

    span.textContent =
    newText;


    /*
        Remove input
    */

    editingInput.remove();

    editingInput = null;


    status.textContent =
    "Text updated.";

}


/*
==================================================
CANCEL
==================================================
*/

function cancelEditing(){

    if(editingInput){

        editingInput.remove();

        editingInput = null;

    }

}


/*
==================================================
FONT SIZE
==================================================
*/

fontSizeInput.addEventListener(
"change",
function(){

    if(!selectedText) return;


    const size =
    Number(
        this.value
    );


    selectedText.style.fontSize =
    size + "px";


    const index =
    Number(
        selectedText.dataset.index
    );


    if(!pageData[currentPage]){

        pageData[currentPage]=[];

    }


    if(!pageData[currentPage][index]){

        pageData[currentPage][index] = {

            text:selectedText.textContent

        };

    }


    pageData[currentPage][index].fontSize =
    size;

});


/*
==================================================
BOLD
==================================================
*/

boldBtn.addEventListener(
"click",
function(){

    if(!selectedText) return;


    const current =
    selectedText.style.fontWeight;


    selectedText.style.fontWeight =
    current === "bold"
    ? "normal"
    : "bold";

});


/*
==================================================
ITALIC
==================================================
*/

italicBtn.addEventListener(
"click",
function(){

    if(!selectedText) return;


    const current =
    selectedText.style.fontStyle;


    selectedText.style.fontStyle =
    current === "italic"
    ? "normal"
    : "italic";

});


/*
==================================================
ADD NEW TEXT
==================================================
*/

addTextBtn.addEventListener(
"click",
function(){

    const span =
    document.createElement("span");


    span.className =
    "pdf-text";


    span.textContent =
    "New Text";


    span.style.color =
    "#000";


    span.style.left =
    "100px";


    span.style.top =
    "100px";


    span.style.fontSize =
    "18px";


    span.style.width =
    "150px";


    span.style.height =
    "30px";


    span.addEventListener(
    "dblclick",
    function(){

        startNewText(span);

    });


    textLayer.appendChild(
    span
    );


    startNewText(span);

});


function startNewText(span){

    const input =
    document.createElement(
        "input"
    );


    input.className =
    "editBox";


    input.value =
    span.textContent;


    input.style.left =
    span.offsetLeft + "px";


    input.style.top =
    span.offsetTop + "px";


    input.style.fontSize =
    "18px";


    textLayer.appendChild(
    input
    );


    input.focus();

    input.select();


    input.addEventListener(
    "keydown",
    function(event){

        if(event.key==="Enter"){

            span.textContent =
            input.value;

            input.remove();

        }

    });


    input.addEventListener(
    "blur",
    function(){

        span.textContent =
        input.value;

        input.remove();

    });

}


/*
==================================================
DELETE
==================================================
*/

deleteBtn.addEventListener(
"click",
function(){

    if(!selectedText){

        alert(
            "Pehle text select karein."
        );

        return;

    }


    selectedText.remove();

    selectedText = null;

});


/*
==================================================
PREVIOUS
==================================================
*/

prevBtn.addEventListener(
"click",
async function(){

    if(!pdf) return;

    if(currentPage <= 1) return;

    await renderPage(
        currentPage - 1
    );

});


/*
==================================================
NEXT
==================================================
*/

nextBtn.addEventListener(
"click",
async function(){

    if(!pdf) return;

    if(currentPage >= totalPages) return;

    await renderPage(
        currentPage + 1
    );

});


/*
==================================================
DOWNLOAD
==================================================
*/

/*
 IMPORTANT:

 This creates a new PDF using the
 original rendered page + edited
 text.

 It is a visual reconstruction.
*/

downloadBtn.addEventListener(
"click",
async function(){

    if(!pdf){

        alert(
            "Pehle PDF upload karein."
        );

        return;

    }


    finishEditing();


    status.textContent =
    "Creating PDF...";


    try{

        const {
            jsPDF
        } = window.jspdf;


        let output = null;


        for(
            let p=1;
            p<=totalPages;
            p++
        ){

            const page =
            await pdf.getPage(p);


            const viewport =
            page.getViewport({
                scale:1.5
            });


            const temp =
            document.createElement(
                "canvas"
            );


            temp.width =
            viewport.width;

            temp.height =
            viewport.height;


            await page.render({

                canvasContext:
                temp.getContext("2d"),

                viewport:viewport

            }).promise;


            /*
                A4-ish PDF using rendered
                page image.
            */

            const width =
            viewport.width;

            const height =
            viewport.height;


            if(!output){

                output =
                new jsPDF({

                    orientation:
                    width > height
                    ? "landscape"
                    : "portrait",

                    unit:"pt",

                    format:[
                        width,
                        height
                    ]

                });

            }
            else{

                output.addPage([
                    width,
                    height
                ]);

            }


            /*
                Original page
            */

            output.addImage(
                temp.toDataURL(
                    "image/jpeg",
                    .95
                ),
                "JPEG",
                0,
                0,
                width,
                height
            );


            /*
                Get edited text
            */

            const edits =
            pageData[p] || [];


            /*
                Add edited text
                over original.
            */

            for(
                const item of edits
            ){

                if(
                    !item ||
                    !item.text
                ) continue;


                /*
                    NOTE:
                    Exact coordinates need
                    text transform mapping.
                */

            }

        }


        output.save(
            "edited-pdf.pdf"
        );


        status.textContent =
        "PDF downloaded.";

    }
    catch(error){

        console.error(error);

        status.textContent =
        "Download failed.";

    }

});
