pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";


const fileInput =
  document.getElementById("file");

const canvas =
  document.getElementById("canvas");

const ctx =
  canvas.getContext("2d");

const textLayer =
  document.getElementById("textLayer");

const pageBox =
  document.getElementById("pageBox");

const viewer =
  document.getElementById("viewer");

const message =
  document.getElementById("message");

const pageLabel =
  document.getElementById("page");

const prevButton =
  document.getElementById("prev");

const nextButton =
  document.getElementById("next");

const downloadButton =
  document.getElementById("download");


let pdf = null;

let currentPage = 1;

let totalPages = 0;


/*
  1.35 gives good quality while
  remaining reasonably fast on mobile.
*/

const SCALE = 1.35;


/*
  All text objects are stored here.
*/

const pages = {};


/*
  Used for mobile double tap.
*/

let lastTap = 0;

let tapTimer = null;

let editing = null;


/* =====================================================
   OPEN PDF
===================================================== */

fileInput.addEventListener(
  "change",
  async function () {

    const file = this.files[0];

    if (!file) return;

    try {

      message.textContent =
        "PDF loading...";

      const buffer =
        await file.arrayBuffer();

      pdf =
        await pdfjsLib.getDocument({
          data: buffer
        }).promise;

      totalPages =
        pdf.numPages;

      currentPage = 1;

      Object.keys(pages).forEach(
        key => delete pages[key]
      );

      await showPage(1);

      message.textContent =
        "Text par double-tap karein.";

    } catch (error) {

      console.error(error);

      message.textContent =
        "PDF open nahi hua.";

    }

  }
);


/* =====================================================
   SHOW PAGE
===================================================== */

async function showPage(pageNumber) {

  if (!pdf) return;

  finishEdit();

  const page =
    await pdf.getPage(pageNumber);

  const viewport =
    page.getViewport({
      scale: SCALE
    });


  canvas.width =
    viewport.width;

  canvas.height =
    viewport.height;


  pageBox.style.width =
    viewport.width + "px";

  pageBox.style.height =
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
    Get PDF text
  */

  const content =
    await page.getTextContent();


  /*
    First time page is opened,
    create objects.
  */

  if (!pages[pageNumber]) {

    pages[pageNumber] = [];

    content.items.forEach(
      (item, index) => {

        if (
          !item.str ||
          !item.str.trim()
        ) {
          return;
        }


        const tx =
          pdfjsLib.Util.transform(
            viewport.transform,
            item.transform
          );


        /*
          PDF.js gives baseline.
        */

        const x =
          tx[4];


        const fontHeight =
          Math.max(
            Math.abs(tx[3]),
            8
          );


        const y =
          tx[5] -
          fontHeight;


        pages[pageNumber].push({

          id: index,

          original: item.str,

          text: item.str,

          x: x,

          y: y,

          width:
            Math.max(
              item.width * SCALE,
              25
            ),

          height:
            fontHeight * 1.35,

          fontSize:
            fontHeight

        });

      }
    );

  }


  /*
    Create clickable text boxes.
  */

  pages[pageNumber].forEach(
    item => {

      if (item.deleted) return;

      createText(item);

    }
  );


  currentPage =
    pageNumber;

  pageLabel.textContent =
    `${currentPage} / ${totalPages}`;

}


/* =====================================================
   CREATE TEXT
===================================================== */

function createText(item) {

  const el =
    document.createElement("div");

  el.className =
    "pdfText";

  el.dataset.id =
    item.id;

  el.textContent =
    item.text;


  el.style.left =
    item.x + "px";

  el.style.top =
    item.y + "px";

  el.style.width =
    Math.max(
      item.width,
      25
    ) + "px";

  el.style.height =
    Math.max(
      item.height,
      20
    ) + "px";

  el.style.fontSize =
    item.fontSize + "px";


  /*
    Desktop
  */

  el.addEventListener(
    "dblclick",
    function (event) {

      event.preventDefault();

      event.stopPropagation();

      beginEdit(
        el,
        item
      );

    }
  );


  /*
    MOBILE DOUBLE TAP
  */

  el.addEventListener(
    "touchend",
    function (event) {

      event.preventDefault();

      event.stopPropagation();


      const now =
        Date.now();


      const delta =
        now - lastTap;


      /*
        Second tap within 500ms
      */

      if (
        delta > 0 &&
        delta < 500
      ) {

        clearTimeout(tapTimer);

        lastTap = 0;

        beginEdit(
          el,
          item
        );

        return;

      }


      /*
        First tap
      */

      lastTap = now;


      clearTimeout(tapTimer);


      tapTimer =
        setTimeout(
          function () {

            lastTap = 0;

          },
          500
        );

    },
    {
      passive: false
    }
  );


  /*
    Normal mouse click
  */

  el.addEventListener(
    "click",
    function (event) {

      event.stopPropagation();

    }
  );


  textLayer.appendChild(el);

}


/* =====================================================
   BEGIN EDIT
===================================================== */

function beginEdit(
  element,
  item
) {

  /*
    If another text is being edited,
    save it first.
  */

  finishEdit();


  editing = {

    element: element,

    item: item

  };


  /*
    Turn existing div into
    contenteditable.
  */

  element.contentEditable = "true";

  element.classList.add(
    "editing"
  );


  /*
    Make sure browser can select text.
  */

  element.style.color =
    "#000";

  element.style.width =
    Math.max(
      item.width + 20,
      60
    ) + "px";


  /*
    Put cursor at end.
  */

  element.focus();


  const range =
    document.createRange();

  range.selectNodeContents(
    element
  );


  const selection =
    window.getSelection();

  selection.removeAllRanges();

  selection.addRange(range);


  message.textContent =
    "Text edit karein, phir Done/Enter dabayein.";


  /*
    Keyboard Enter
  */

  element.addEventListener(
    "keydown",
    editingKeyHandler
  );

}


/* =====================================================
   EDIT KEYBOARD
===================================================== */

function editingKeyHandler(event) {

  if (event.key === "Enter") {

    event.preventDefault();

    finishEdit();

  }


  if (event.key === "Escape") {

    event.preventDefault();

    cancelEdit();

  }

}


/* =====================================================
   FINISH EDIT
===================================================== */

function finishEdit() {

  if (!editing) return;


  const element =
    editing.element;

  const item =
    editing.item;


  /*
    Get edited text.
  */

  const newText =
    element.innerText
      .replace(/\n/g, " ")
      .trim();


  if (newText.length > 0) {

    item.text =
      newText;

  }


  /*
    Stop content editing.
  */

  element.contentEditable =
    "false";

  element.classList.remove(
    "editing"
  );


  /*
    Important:
    Changed text is visible above
    the original PDF.
  */

  element.style.color =
    "#000";

  element.style.background =
    "#fff";


  element.removeEventListener(
    "keydown",
    editingKeyHandler
  );


  editing = null;


  message.textContent =
    "Text saved ✓";

}


/* =====================================================
   CANCEL EDIT
===================================================== */

function cancelEdit() {

  if (!editing) return;


  const element =
    editing.element;

  const item =
    editing.item;


  element.textContent =
    item.text;


  element.contentEditable =
    "false";

  element.classList.remove(
    "editing"
  );


  element.style.color =
    "transparent";

  element.style.background =
    "transparent";


  editing = null;

}


/* =====================================================
   PAGE NAVIGATION
===================================================== */

prevButton.addEventListener(
  "click",
  async function () {

    if (!pdf) return;

    if (currentPage <= 1) return;

    await showPage(
      currentPage - 1
    );

  }
);


nextButton.addEventListener(
  "click",
  async function () {

    if (!pdf) return;

    if (
      currentPage >= totalPages
    ) {
      return;
    }

    await showPage(
      currentPage + 1
    );

  }
);


/* =====================================================
   DOWNLOAD
===================================================== */

downloadButton.addEventListener(
  "click",
  async function () {

    if (!pdf) {

      alert(
        "Pehle PDF open karein."
      );

      return;

    }


    finishEdit();


    message.textContent =
      "PDF bana raha hoon...";


    try {

      const {
        jsPDF
      } = window.jspdf;


      let output = null;


      /*
        Render every page again.
      */

      for (
        let number = 1;
        number <= totalPages;
        number++
      ) {

        const page =
          await pdf.getPage(number);


        const viewport =
          page.getViewport({
            scale: 2
          });


        const outCanvas =
          document.createElement(
            "canvas"
          );


        outCanvas.width =
          viewport.width;

        outCanvas.height =
          viewport.height;


        const outCtx =
          outCanvas.getContext(
            "2d"
          );


        /*
          Original page
        */

        await page.render({

          canvasContext: outCtx,

          viewport: viewport

        }).promise;


        /*
          Draw modified text.
        */

        const items =
          pages[number] || [];


        items.forEach(
          item => {

            if (
              item.text ===
              item.original
            ) {
              return;
            }


            /*
              Coordinates from editor
              to download canvas.
            */

            const factor =
              2 / SCALE;


            const x =
              item.x * factor;


            const y =
              item.y * factor;


            const width =
              Math.max(
                item.width * factor,
                30
              );


            const height =
              Math.max(
                item.height * factor,
                20
              );


            /*
              Hide old text.
            */

            outCtx.fillStyle =
              "#ffffff";

            outCtx.fillRect(
              x,
              y,
              width,
              height
            );


            /*
              New text.
            */

            outCtx.fillStyle =
              "#000000";


            outCtx.font =
              `${item.fontSize * factor}px Arial`;


            outCtx.textBaseline =
              "top";


            outCtx.fillText(
              item.text,
              x + 2,
              y + 1
            );

          }
        );


        const img =
          outCanvas.toDataURL(
            "image/jpeg",
            0.95
          );


        const pdfWidth =
          viewport.width / 2;

        const pdfHeight =
          viewport.height / 2;


        if (!output) {

          output =
            new jsPDF({

              unit: "pt",

              format: [
                pdfWidth,
                pdfHeight
              ],

              orientation:
                pdfWidth > pdfHeight
                  ? "landscape"
                  : "portrait"

            });

        }
        else {

          output.addPage([
            pdfWidth,
            pdfHeight
          ]);

        }


        output.addImage(
          img,
          "JPEG",
          0,
          0,
          pdfWidth,
          pdfHeight
        );

      }


      output.save(
        "edited-pdf.pdf"
      );


      message.textContent =
        "Download complete ✓";


    } catch (error) {

      console.error(error);

      message.textContent =
        "PDF download mein error.";

    }

  }
);
