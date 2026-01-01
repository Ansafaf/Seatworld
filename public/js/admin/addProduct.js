let cropper;
let currentInputId;
let currentFiles = {}; // Store files for each variant index

window.handleImageSelect = (event, index) => {
  const files = Array.from(event.target.files);
  if (!currentFiles[index]) currentFiles[index] = [];

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileId = Math.random().toString(36).substr(2, 9);
      currentFiles[index].push({ id: fileId, file: file, preview: e.target.result });
      renderPreviews(index);
    };
    reader.readAsDataURL(file);
  });

  // Clear input so same file can be selected again if removed
  event.target.value = '';
}

window.renderPreviews = (index) => {
  const container = document.getElementById(`preview_${index}`);
  container.innerHTML = '';

  currentFiles[index].forEach((fileObj, i) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.innerHTML = `
          <img src="${fileObj.preview}" alt="Preview">
          <div class="remove-btn" onclick="removeImage(${index}, ${i})">&times;</div>
          <div class="crop-btn" onclick="openCropper(${index}, ${i})">Crop</div>
        `;
    container.appendChild(item);
  });

  updateInputFiles(index);
}

window.removeImage = (index, fileIndex) => {
  currentFiles[index].splice(fileIndex, 1);
  renderPreviews(index);
}

let cropTarget = { index: null, fileIndex: null };

window.openCropper = (index, fileIndex) => {
  const fileObj = currentFiles[index][fileIndex];
  cropTarget = { index, fileIndex };

  const modal = document.getElementById('cropperModal');
  const image = document.getElementById('cropperImage');
  image.src = fileObj.preview;

  modal.style.display = 'flex';

  if (cropper) cropper.destroy();
  cropper = new Cropper(image, {
    aspectRatio: 1,
    viewMode: 1,
  });
}

window.closeCropper = () => {
  document.getElementById('cropperModal').style.display = 'none';
  if (cropper) cropper.destroy();
}

window.applyCrop = () => {
  const canvas = cropper.getCroppedCanvas();
  canvas.toBlob((blob) => {
    const index = cropTarget.index;
    const fileIndex = cropTarget.fileIndex;
    const originalFile = currentFiles[index][fileIndex].file;

    // Create new file from blob
    const croppedFile = new File([blob], originalFile.name, { type: 'image/jpeg' });

    // Update currentFiles
    currentFiles[index][fileIndex].file = croppedFile;
    currentFiles[index][fileIndex].preview = canvas.toDataURL('image/jpeg');

    renderPreviews(index);
    closeCropper();
  }, 'image/jpeg');
}

function updateInputFiles(index) {
  const input = document.querySelector(`input[name="images_${index}"]`);
  if (!input) return;

  const dataTransfer = new DataTransfer();
  currentFiles[index].forEach(fileObj => {
    dataTransfer.items.add(fileObj.file);
  });
  input.files = dataTransfer.files;
}

// Submit validation
const addProductForm = document.getElementById('addProductForm');
if (addProductForm) {
  addProductForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = this.querySelector('button[type="submit"]');
    if (submitBtn.disabled) return;

    // Show loading state
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Saving...
    `;

    Swal.fire({
      title: 'Saving Product...',
      text: 'Please wait while we upload images and process the data.',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const formData = new FormData(this);
      const response = await fetch(this.action, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: data.message,
          showConfirmButton: false,
          timer: 1500
        }).then(() => {
          window.location.href = data.redirectUrl || '/admin/products';
        });
      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.message || 'Something went wrong',
        });
      }
    } catch (error) {
      console.error('Error:', error);
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An unexpected error occurred. Please try again.',
      });
    }
  });
}

let variantIndex = 1;

window.addVariant = () => {
  const container = document.getElementById("variantContainer");

  const html = `
        <div class="variant-row grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
          <button
            type="button"
            onclick="removeVariant(this)"
            class="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md"
            title="Remove variant"
          >
            <span class="material-icons-outlined text-sm">close</span>
          </button>
          
          <input type="hidden" name="variantIndices[]" value="${variantIndex}">

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Color</label>
            <input
              type="text"
              name="color[]"
              class="block w-full rounded-lg border-gray-300 bg-white text-gray-900 shadow-sm focus:border-primary focus:ring-primary"
              placeholder="e.g. Yellow"
              required
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Price</label>
            <input
              type="number"
              name="variantPrice[]"
              class="block w-full rounded-lg border-gray-300 bg-white text-gray-900 shadow-sm focus:border-primary focus:ring-primary"
              min="0"
              required
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Stock</label>
            <input
              type="number"
              name="variantStock[]"
              class="block w-full rounded-lg border-gray-300 bg-white text-gray-900 shadow-sm focus:border-primary focus:ring-primary"
              min="0"
              required
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Images</label>
            <input
              type="file"
              name="images_${variantIndex}"
              accept="image/*"
              multiple
              onchange="handleImageSelect(event, ${variantIndex})"
              class="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-orange-600 cursor-pointer"
            />
            <p class="text-[11px] text-gray-400 mt-1">You can upload multiple images for this color.</p>
            <div id="preview_${variantIndex}" class="image-preview-container"></div>
          </div>
        </div>
      `;

  container.insertAdjacentHTML("beforeend", html);
  variantIndex++;
}

window.removeVariant = (button) => {
  const row = button.closest(".variant-row");
  if (row) row.remove();
}
