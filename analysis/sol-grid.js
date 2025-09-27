const gridContainer = document.getElementById("solution-grid");
const fileLoader = document.getElementById("file-loader");
const lightboxOverlay = document.getElementById("lightbox-overlay");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxClose = document.getElementById("lightbox-close");

const placeholderImage = "images/placeholder.png";
const totalSolutions = 240;

function showLightbox(imageSrc) {
  lightboxImage.src = imageSrc;
  lightboxOverlay.style.display = "flex";
}

function hideLightbox() {
  lightboxOverlay.style.display = "none";
}

function createGrid() {
  for (let i = 1; i <= totalSolutions; i++) {
    const slot = document.createElement("div");
    slot.className = "grid-slot";
    slot.dataset.solutionId = i;
    slot.dataset.populated = "false"; // Track if the slot has a real image

    const img = document.createElement("img");
    img.src = placeholderImage;
    img.alt = `Solution ${i}`;
    img.id = `img-${i}`;

    const num = document.createElement("div");
    num.className = "solution-number";
    num.textContent = i;

    slot.appendChild(img);
    slot.appendChild(num);

    slot.addEventListener("click", () => {
      if (slot.dataset.populated === "true") {
        showLightbox(img.src);
      } else {
        fileLoader.click();
      }
    });

    gridContainer.appendChild(slot);
  }
}

function handleFileLoad(event) {
  const files = event.target.files;
  if (!files.length) {
    return;
  }

  for (const file of files) {
    const match = file.name.match(/^(\d+)-/);
    if (match && match[1]) {
      const solutionId = parseInt(match[1], 10);
      if (solutionId > 0 && solutionId <= totalSolutions) {
        const slot = gridContainer.querySelector(
          `[data-solution-id='${solutionId}']`,
        );
        const imgElement = document.getElementById(`img-${solutionId}`);
        if (imgElement && slot) {
          const reader = new FileReader();
          reader.onload = (e) => {
            imgElement.src = e.target.result;
            slot.dataset.populated = "true"; // Mark as populated
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }
  fileLoader.value = "";
}

fileLoader.addEventListener("change", handleFileLoad);
lightboxOverlay.addEventListener("click", hideLightbox);
lightboxClose.addEventListener("click", hideLightbox);

createGrid();
