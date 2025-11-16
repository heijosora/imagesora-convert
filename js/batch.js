document.addEventListener('DOMContentLoaded', () => {
  new ThemeManager();
  new BatchPage();
});

class BatchPage {
  constructor() {
    this.dropZone = document.getElementById('batch-drop-zone');
    this.fileInput = document.getElementById('batch-file-input');
    this.browseBtn = document.getElementById('batch-browse-btn');
    this.fileList = document.getElementById('file-list');
    this.clearBtn = document.getElementById('clear-list');
    this.startBtn = document.getElementById('start-processing');
    this.downloadAllBtn = document.getElementById('download-all');
    this.progressFill = document.getElementById('batch-progress');
    this.progressLabel = document.getElementById('batch-progress-label');
    this.statusNote = document.getElementById('batch-status-note');
    this.outputFormat = document.getElementById('batch-output-format');
    this.qualityOption = document.getElementById('batch-quality-option');
    this.sizeOption = document.getElementById('batch-size-option');
    this.qualityControls = document.getElementById('batch-quality-controls');
    this.sizeControls = document.getElementById('batch-size-controls');
    this.qualitySlider = document.getElementById('batch-quality');
    this.qualityValue = document.getElementById('batch-quality-value');
    this.targetSizeInput = document.getElementById('batch-target-size');
    this.losslessCheckbox = document.getElementById('batch-lossless');

    this.dimensions = new BatchDimensions();
    this.filters = new BatchFilters();
    this.files = [];
    this.zipBlob = null;
    this.processing = false;

    this.bindEvents();
    this.toggleCompressionMethod('quality');
    this.handleLosslessToggle();
    this.updateActionStates();
  }

  bindEvents() {
    this.browseBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleIncomingFiles(e.target.files));

    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        this.dropZone.classList.add('drop-active');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        if (eventName === 'drop' && e.dataTransfer.files.length) {
          this.handleIncomingFiles(e.dataTransfer.files);
        }
        this.dropZone.classList.remove('drop-active');
      });
    });

    this.clearBtn.addEventListener('click', () => {
      if (this.processing) return;
      this.files = [];
      this.zipBlob = null;
      this.renderFileList();
      this.resetProgress();
      this.downloadAllBtn.disabled = true;
      this.fileInput.value = '';
      this.updateActionStates();
    });

    this.startBtn.addEventListener('click', () => this.processFiles());
    this.downloadAllBtn.addEventListener('click', () => this.downloadZip());

    this.qualitySlider.addEventListener('input', () => {
      this.qualityValue.textContent = `${this.qualitySlider.value}%`;
    });

    this.qualityOption.addEventListener('change', () => this.toggleCompressionMethod('quality'));
    this.sizeOption.addEventListener('change', () => this.toggleCompressionMethod('size'));
    this.losslessCheckbox.addEventListener('change', () => this.handleLosslessToggle());
  }

  async handleIncomingFiles(fileList) {
    const newFiles = Array.from(fileList);
    if (!newFiles.length) return;

    for (const file of newFiles) {
      const duplicate = this.files.some(entry => entry.file.name === file.name && entry.file.size === file.size);
      if (duplicate) {
        showStatus(`${file.name} already in queue`, 'warning');
        continue;
      }

      try {
        validateImageFile(file);
        const image = await loadImageFromFile(file);
        this.files.push({
          id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
          file,
          width: image.width,
          height: image.height,
          status: 'Pending',
          blob: null,
          outputName: null,
          error: null
        });

        this.dimensions.seedFromImage(image.width, image.height);
      } catch (err) {
        console.error(err);
        showStatus(err.message, 'error');
      }
    }

    this.renderFileList();
    this.updateActionStates();
    this.fileInput.value = '';
  }

  renderFileList() {
    this.fileList.innerHTML = '';

    if (!this.files.length) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-gray-500 text-center py-6';
      empty.textContent = 'No files queued';
      this.fileList.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();

    this.files.forEach((entry, index) => {
      const row = document.createElement('div');
      row.className = 'flex items-start justify-between bg-white dark:bg-gray-900/60 rounded-lg p-3 text-sm';
      row.innerHTML = `
        <div class="w-full pr-3">
          <p class="font-medium truncate">${entry.file.name}</p>
          <p class="text-xs text-gray-500">${formatFileSize(entry.file.size)} • ${entry.width}×${entry.height}px</p>
          <p class="text-xs mt-1 ${entry.error ? 'text-red-500' : 'text-blue-500'}">${entry.status}</p>
        </div>
        <button class="shrink-0 px-2 py-1 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600" data-remove="${index}">×</button>
      `;
      fragment.appendChild(row);
    });

    this.fileList.appendChild(fragment);

    this.fileList.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (this.processing) return;
        const idx = parseInt(e.currentTarget.getAttribute('data-remove'), 10);
        this.files.splice(idx, 1);
        this.renderFileList();
        this.updateActionStates();
      });
    });
  }

  updateActionStates() {
    this.startBtn.disabled = !this.files.length || this.processing;
    this.clearBtn.disabled = !this.files.length || this.processing;
    if (!this.processing && !this.files.length) {
      this.downloadAllBtn.disabled = true;
    }
  }

  resetProgress() {
    this.progressFill.style.width = '0%';
    this.progressLabel.textContent = '0 / 0';
    this.statusNote.textContent = '';
  }

  toggleCompressionMethod(method) {
    if (this.losslessCheckbox.checked) return;

    if (method === 'quality') {
      this.qualityControls.classList.remove('opacity-50', 'pointer-events-none');
      this.sizeControls.classList.add('opacity-50', 'pointer-events-none');
    } else {
      this.sizeControls.classList.remove('opacity-50', 'pointer-events-none');
      this.qualityControls.classList.add('opacity-50', 'pointer-events-none');
    }
  }

  handleLosslessToggle() {
    if (this.losslessCheckbox.checked) {
      this.outputFormat.value = 'png';
      this.outputFormat.disabled = true;
      this.qualityOption.disabled = true;
      this.sizeOption.disabled = true;
      this.qualityControls.classList.add('opacity-50', 'pointer-events-none');
      this.sizeControls.classList.add('opacity-50', 'pointer-events-none');
    } else {
      this.outputFormat.disabled = false;
      this.qualityOption.disabled = false;
      this.sizeOption.disabled = false;
      this.toggleCompressionMethod(this.qualityOption.checked ? 'quality' : 'size');
    }
  }

  getCompressionSettings() {
    const format = this.outputFormat.value;
    if (this.losslessCheckbox.checked) {
      return { method: 'lossless', format: 'png' };
    }

    if (this.sizeOption.checked) {
      return {
        method: 'size',
        format,
        targetMB: Math.max(parseFloat(this.targetSizeInput.value) || 0, 0.1)
      };
    }

    return {
      method: 'quality',
      format,
      quality: Math.min(Math.max(parseInt(this.qualitySlider.value, 10) || 90, 1), 100)
    };
  }

  async processFiles() {
    if (!this.files.length || this.processing) return;

    if (typeof JSZip === 'undefined') {
      showStatus('Batch processing requires JSZip', 'error');
      return;
    }

    this.processing = true;
    this.zipBlob = null;
    this.startBtn.disabled = true;
    this.startBtn.textContent = 'Processing...';
    this.downloadAllBtn.disabled = true;
    this.statusNote.textContent = 'Processing files...';

    const zip = new JSZip();
    const filters = this.filters.getValues();
    const compression = this.getCompressionSettings();
    let processed = 0;

    for (const entry of this.files) {
      try {
        entry.status = 'Processing...';
        entry.error = null;
        this.renderFileList();

        const image = await loadImageFromFile(entry.file);
        const targetDims = this.dimensions.getTargetDimensions(image.width, image.height);
        const canvas = createCanvasFromImage(image, targetDims.width, targetDims.height, filters);
        const blob = await this.generateBlob(canvas, compression);

        if (!blob) {
          throw new Error('Conversion failed');
        }

        entry.blob = blob;
        entry.outputName = this.buildOutputName(entry.file.name, compression.format);
        entry.status = `Done • ${formatFileSize(blob.size)}`;
        zip.file(entry.outputName, blob);
      } catch (err) {
        entry.status = 'Failed';
        entry.error = err.message;
        console.error(err);
      }

      processed += 1;
      this.renderFileList();
      this.updateProgress(processed, this.files.length);
    }

    const successful = this.files.filter(file => file.blob).length;

    if (successful) {
      this.zipBlob = await zip.generateAsync({ type: 'blob' });
      this.downloadAllBtn.disabled = false;
      this.statusNote.textContent = `Processed ${successful} of ${this.files.length} file${this.files.length === 1 ? '' : 's'}`;
      showStatus('Batch processing complete', 'success');
    } else {
      this.statusNote.textContent = 'No files processed';
      showStatus('All conversions failed – please review inputs', 'error');
    }

    this.processing = false;
    this.startBtn.textContent = 'Start Processing';
    this.updateActionStates();
    this.renderFileList();
  }

  async generateBlob(canvas, compression) {
    if (compression.method === 'lossless') {
      return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1));
    }

    if (compression.method === 'size') {
      const bytes = compression.targetMB * 1024 * 1024;
      return compressToTargetSize(canvas, bytes, compression.format);
    }

    const quality = compression.quality / 100;
    const mime = `image/${compression.format}`;
    return new Promise(resolve => canvas.toBlob(resolve, mime, quality));
  }

  updateProgress(done, total) {
    const percent = total === 0 ? 0 : (done / total) * 100;
    this.progressFill.style.width = `${percent}%`;
    this.progressLabel.textContent = `${done} / ${total}`;
  }

  buildOutputName(originalName, format) {
    const base = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
    return `${base}_batch.${format}`;
  }

  downloadZip() {
    if (!this.zipBlob) return;
    if (typeof saveAs !== 'function') {
      showStatus('FileSaver dependency missing', 'error');
      return;
    }

    saveAs(this.zipBlob, 'sigma-sora-batch.zip');
    showStatus('Batch archive downloaded', 'success');
  }
}

class BatchDimensions {
  constructor() {
    this.widthInput = document.getElementById('batch-width-px');
    this.heightInput = document.getElementById('batch-height-px');
    this.widthCm = document.getElementById('batch-width-cm');
    this.heightCm = document.getElementById('batch-height-cm');
    this.dpiInput = document.getElementById('batch-dpi');
    this.aspectLockBtn = document.getElementById('batch-aspect-lock');
    this.lockIcon = document.getElementById('batch-lock-icon');
    this.unlockIcon = document.getElementById('batch-unlock-icon');

    this.aspectRatio = 1;
    this.isLocked = true;

    this.bindEvents();
  }

  bindEvents() {
    this.aspectLockBtn.addEventListener('click', () => this.toggleLock());

    this.widthInput.addEventListener('input', debounce(() => {
      const width = parseInt(this.widthInput.value, 10);
      if (this.isLocked && width && this.aspectRatio) {
        this.heightInput.value = Math.round(width / this.aspectRatio);
      }
      this.updateCmValues();
    }, 200));

    this.heightInput.addEventListener('input', debounce(() => {
      const height = parseInt(this.heightInput.value, 10);
      if (this.isLocked && height && this.aspectRatio) {
        this.widthInput.value = Math.round(height * this.aspectRatio);
      }
      this.updateCmValues();
    }, 200));

    this.dpiInput.addEventListener('input', debounce(() => this.updateCmValues(), 200));
  }

  toggleLock() {
    this.isLocked = !this.isLocked;
    if (this.isLocked) {
      this.lockIcon.classList.remove('hidden');
      this.unlockIcon.classList.add('hidden');
      if (this.widthInput.value && this.heightInput.value) {
        this.aspectRatio = parseInt(this.widthInput.value, 10) / parseInt(this.heightInput.value, 10);
      }
    } else {
      this.lockIcon.classList.add('hidden');
      this.unlockIcon.classList.remove('hidden');
    }
  }

  seedFromImage(width, height) {
    if (!this.widthInput.value && !this.heightInput.value) {
      this.applyDimensions(width, height);
    }
  }

  applyDimensions(width, height) {
    this.widthInput.value = width;
    this.heightInput.value = height;
    this.aspectRatio = width / height;
    this.updateCmValues();
  }

  updateCmValues() {
    const dpi = Math.max(parseInt(this.dpiInput.value, 10) || 300, 72);
    const width = parseInt(this.widthInput.value, 10) || 0;
    const height = parseInt(this.heightInput.value, 10) || 0;
    this.widthCm.value = width ? pixelsToCm(width, dpi) : '';
    this.heightCm.value = height ? pixelsToCm(height, dpi) : '';
  }

  getTargetDimensions(originalWidth, originalHeight) {
    const width = parseInt(this.widthInput.value, 10);
    const height = parseInt(this.heightInput.value, 10);
    if (!width || !height) {
      return { width: originalWidth, height: originalHeight };
    }
    return { width, height };
  }
}

class BatchFilters {
  constructor() {
    this.controls = {
      brightness: { element: document.getElementById('batch-brightness'), value: 100, display: document.getElementById('batch-brightness-value'), default: 100 },
      contrast: { element: document.getElementById('batch-contrast'), value: 100, display: document.getElementById('batch-contrast-value'), default: 100 },
      saturate: { element: document.getElementById('batch-saturate'), value: 100, display: document.getElementById('batch-saturate-value'), default: 100 },
      grayscale: { element: document.getElementById('batch-grayscale'), value: 0, display: document.getElementById('batch-grayscale-value'), default: 0 },
      sepia: { element: document.getElementById('batch-sepia'), value: 0, display: document.getElementById('batch-sepia-value'), default: 0 }
    };
    this.resetBtn = document.getElementById('batch-reset-filters');
    this.bindEvents();
  }

  bindEvents() {
    Object.keys(this.controls).forEach((key) => {
      const control = this.controls[key];
      control.display.textContent = `${control.value}%`;
      control.element.addEventListener('input', () => {
        control.value = control.element.value;
        control.display.textContent = `${control.value}%`;
      });
    });

    this.resetBtn.addEventListener('click', () => this.reset());
  }

  reset() {
    Object.values(this.controls).forEach(control => {
      control.value = control.default;
      control.element.value = control.default;
      control.display.textContent = `${control.value}%`;
    });
  }

  getValues() {
    return Object.keys(this.controls).reduce((acc, key) => {
      acc[key] = this.controls[key].value;
      return acc;
    }, {});
  }
}
