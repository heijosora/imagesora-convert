document.addEventListener('DOMContentLoaded', () => {
  new ThemeManager();
  new CropTool();
  new RotateTool();
  new WatermarkTool();
});

class CropTool {
  constructor() {
    this.input = document.getElementById('crop-input');
    this.canvas = document.getElementById('crop-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.downloadBtn = document.getElementById('crop-download');
    this.resetBtn = document.getElementById('crop-reset');
    this.originalImage = null;
    this.selection = null;
    this.croppedCanvas = null;
    this.isDragging = false;
    this.scaleFactor = 1;
    this.bindEvents();
  }

  bindEvents() {
    this.input.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadImage(e.target.files[0]);
      }
    });

    this.canvas.addEventListener('mousedown', (e) => this.startSelection(e));
    this.canvas.addEventListener('mousemove', (e) => this.updateSelection(e));
    ['mouseup', 'mouseleave'].forEach(eventName => {
      this.canvas.addEventListener(eventName, () => this.endSelection());
    });

    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  async loadImage(file) {
    try {
      validateImageFile(file);
      const image = await loadImageFromFile(file);
      this.originalImage = image;
      const maxWidth = 700;
      const maxHeight = 420;
      this.scaleFactor = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      this.canvas.width = Math.round(image.width * this.scaleFactor);
      this.canvas.height = Math.round(image.height * this.scaleFactor);
      this.selection = null;
      this.croppedCanvas = null;
      this.downloadBtn.disabled = true;
      this.resetBtn.disabled = false;
      this.render();
      showStatus('Crop image ready', 'success');
    } catch (err) {
      console.error(err);
      showStatus(err.message, 'error');
    }
  }

  startSelection(event) {
    if (!this.originalImage) return;
    this.isDragging = true;
    const { x, y } = this.getPointer(event);
    this.selection = { startX: x, startY: y, endX: x, endY: y };
  }

  updateSelection(event) {
    if (!this.isDragging || !this.selection) return;
    const { x, y } = this.getPointer(event);
    this.selection.endX = x;
    this.selection.endY = y;
    this.render();
  }

  endSelection() {
    if (!this.isDragging) return;
    this.isDragging = false;
    const normalized = this.getNormalizedSelection();
    if (normalized) {
      this.selection = normalized;
      this.generateCrop();
    } else {
      this.selection = null;
      this.croppedCanvas = null;
      this.downloadBtn.disabled = true;
      this.render();
    }
  }

  getPointer(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  getNormalizedSelection(requireMinimum = true) {
    if (!this.selection) return null;
    const { startX, startY, endX, endY } = this.selection;
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    if (requireMinimum && (width < 5 || height < 5)) {
      return null;
    }
    return { startX, startY, endX, endY, x, y, width, height };
  }

  generateCrop() {
    if (!this.originalImage || !this.selection) return;
    const { x, y, width, height } = this.selection;
    const actualX = Math.round(x / this.scaleFactor);
    const actualY = Math.round(y / this.scaleFactor);
    const actualWidth = Math.max(Math.round(width / this.scaleFactor), 1);
    const actualHeight = Math.max(Math.round(height / this.scaleFactor), 1);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = actualWidth;
    tempCanvas.height = actualHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(
      this.originalImage,
      actualX,
      actualY,
      actualWidth,
      actualHeight,
      0,
      0,
      actualWidth,
      actualHeight
    );

    this.croppedCanvas = tempCanvas;
    this.downloadBtn.disabled = false;
    this.render();
    showStatus('Selection ready to download', 'success');
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.originalImage) return;
    this.ctx.drawImage(this.originalImage, 0, 0, this.canvas.width, this.canvas.height);

    if (!this.selection) return;
    const selection = this.getNormalizedSelection(false);
    if (!selection) return;
    this.ctx.save();
    this.ctx.strokeStyle = 'rgb(59,130,246)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 4]);
    this.ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
    this.ctx.fillStyle = 'rgba(59,130,246,0.15)';
    this.ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
    this.ctx.restore();
  }

  download() {
    if (!this.croppedCanvas) return;
    this.croppedCanvas.toBlob((blob) => {
      if (!blob) {
        showStatus('Unable to export crop', 'error');
        return;
      }
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = 'sigma-sora-crop.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showStatus('Cropped image downloaded', 'success');
    }, 'image/png', 1);
  }

  reset() {
    this.selection = null;
    this.croppedCanvas = null;
    this.originalImage = null;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.downloadBtn.disabled = true;
    this.resetBtn.disabled = true;
    this.input.value = '';
  }
}

class RotateTool {
  constructor() {
    this.input = document.getElementById('rotate-input');
    this.canvas = document.getElementById('rotate-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ccwBtn = document.getElementById('rotate-ccw');
    this.cwBtn = document.getElementById('rotate-cw');
    this.downloadBtn = document.getElementById('rotate-download');
    this.image = null;
    this.rotation = 0;
    this.displayWidth = 0;
    this.displayHeight = 0;
    this.bindEvents();
  }

  bindEvents() {
    this.input.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadImage(e.target.files[0]);
      }
    });

    this.ccwBtn.addEventListener('click', () => this.rotate(-90));
    this.cwBtn.addEventListener('click', () => this.rotate(90));
    this.downloadBtn.addEventListener('click', () => this.download());
  }

  async loadImage(file) {
    try {
      validateImageFile(file);
      const image = await loadImageFromFile(file);
      this.image = image;
      this.rotation = 0;
      const maxSize = 520;
      const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
      this.displayWidth = Math.round(image.width * scale);
      this.displayHeight = Math.round(image.height * scale);
      this.render();
      this.ccwBtn.disabled = false;
      this.cwBtn.disabled = false;
      this.downloadBtn.disabled = false;
      showStatus('Rotate tool ready', 'success');
    } catch (err) {
      console.error(err);
      showStatus(err.message, 'error');
    }
  }

  rotate(delta) {
    if (!this.image) return;
    this.rotation = (this.rotation + delta + 360) % 360;
    this.render();
  }

  render() {
    if (!this.image) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    const angle = (this.rotation % 360) * Math.PI / 180;
    const sin = Math.abs(Math.sin(angle));
    const cos = Math.abs(Math.cos(angle));
    const canvasWidth = Math.round(this.displayWidth * cos + this.displayHeight * sin);
    const canvasHeight = Math.round(this.displayWidth * sin + this.displayHeight * cos);
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;

    this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    this.ctx.save();
    this.ctx.translate(canvasWidth / 2, canvasHeight / 2);
    this.ctx.rotate(angle);
    this.ctx.drawImage(
      this.image,
      -this.displayWidth / 2,
      -this.displayHeight / 2,
      this.displayWidth,
      this.displayHeight
    );
    this.ctx.restore();
  }

  download() {
    if (!this.image) return;
    const angle = (this.rotation % 360) * Math.PI / 180;
    const sin = Math.abs(Math.sin(angle));
    const cos = Math.abs(Math.cos(angle));
    const width = this.image.width;
    const height = this.image.height;
    const outWidth = Math.round(width * cos + height * sin);
    const outHeight = Math.round(width * sin + height * cos);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = outWidth;
    exportCanvas.height = outHeight;
    const ctx = exportCanvas.getContext('2d');
    ctx.translate(outWidth / 2, outHeight / 2);
    ctx.rotate(angle);
    ctx.drawImage(this.image, -width / 2, -height / 2);

    exportCanvas.toBlob((blob) => {
      if (!blob) {
        showStatus('Unable to export rotation', 'error');
        return;
      }
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = 'sigma-sora-rotate.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showStatus('Rotated image downloaded', 'success');
    }, 'image/png', 1);
  }
}

class WatermarkTool {
  constructor() {
    this.baseInput = document.getElementById('wm-input');
    this.canvas = document.getElementById('wm-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.modeRadios = document.querySelectorAll('input[name="wm-mode"]');
    this.textControls = document.getElementById('wm-text-controls');
    this.logoControls = document.getElementById('wm-logo-controls');
    this.textInput = document.getElementById('wm-text');
    this.colorInput = document.getElementById('wm-color');
    this.fontSlider = document.getElementById('wm-font-size');
    this.textOpacity = document.getElementById('wm-opacity');
    this.logoInput = document.getElementById('wm-logo-input');
    this.logoScale = document.getElementById('wm-logo-scale');
    this.logoOpacity = document.getElementById('wm-logo-opacity');
    this.positionSelect = document.getElementById('wm-position');
    this.downloadBtn = document.getElementById('wm-download');
    this.resetBtn = document.getElementById('wm-reset');
    this.baseImage = null;
    this.logoImage = null;
    this.mode = 'text';
    this.scaleFactor = 1;
    this.dragPosition = null;
    this.dragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.bindEvents();
  }

  bindEvents() {
    this.baseInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadBaseImage(e.target.files[0]);
      }
    });

    this.modeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => this.setMode(e.target.value));
    });

    [this.textInput, this.colorInput].forEach(input => {
      input.addEventListener('input', () => this.render());
    });

    [this.fontSlider, this.textOpacity, this.logoScale, this.logoOpacity].forEach(control => {
      control.addEventListener('input', () => this.render());
    });

    this.logoInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadLogo(e.target.files[0]);
      }
    });

    this.positionSelect.addEventListener('change', () => {
      this.dragging = false;
      this.dragPosition = null;
      this.render();
    });

    this.canvas.addEventListener('mousedown', (e) => this.startDrag(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleDrag(e));
    ['mouseup', 'mouseleave'].forEach(eventName => {
      this.canvas.addEventListener(eventName, () => this.stopDrag());
    });

    this.downloadBtn.addEventListener('click', () => this.download());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  async loadBaseImage(file) {
    try {
      validateImageFile(file);
      const image = await loadImageFromFile(file);
      this.baseImage = image;
      const maxWidth = 700;
      const maxHeight = 420;
      this.scaleFactor = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      this.canvas.width = Math.round(image.width * this.scaleFactor);
      this.canvas.height = Math.round(image.height * this.scaleFactor);
      this.dragPosition = null;
      this.downloadBtn.disabled = false;
      this.resetBtn.disabled = false;
      this.render();
      showStatus('Watermark canvas ready', 'success');
    } catch (err) {
      console.error(err);
      showStatus(err.message, 'error');
    }
  }

  async loadLogo(file) {
    try {
      validateImageFile(file);
      const logo = await loadImageFromFile(file);
      this.logoImage = logo;
      this.render();
      showStatus('Logo loaded', 'success');
    } catch (err) {
      console.error(err);
      showStatus(err.message, 'error');
    }
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'text') {
      this.textControls.classList.remove('hidden');
      this.logoControls.classList.add('hidden');
    } else {
      this.textControls.classList.add('hidden');
      this.logoControls.classList.remove('hidden');
    }
    this.dragPosition = null;
    this.render();
  }

  startDrag(event) {
    if (!this.baseImage || this.positionSelect.value !== 'drag') return;
    const descriptor = this.getDescriptor();
    if (!descriptor) return;
    const pointer = this.getPointer(event);
    const current = this.getPosition(descriptor.width, descriptor.height);
    this.dragging = true;
    this.dragOffset = { x: pointer.x - current.x, y: pointer.y - current.y };
    this.dragPosition = current;
  }

  handleDrag(event) {
    if (!this.dragging) return;
    const descriptor = this.getDescriptor();
    if (!descriptor) return;
    const pointer = this.getPointer(event);
    const x = pointer.x - this.dragOffset.x;
    const y = pointer.y - this.dragOffset.y;
    this.dragPosition = this.clampPosition(x, y, descriptor.width, descriptor.height);
    this.render();
  }

  stopDrag() {
    this.dragging = false;
  }

  getPointer(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  getDescriptor() {
    if (!this.baseImage) return null;
    if (this.mode === 'text') {
      const text = this.textInput.value.trim() || 'Sigma-Sora';
      const fontSize = Math.max(parseInt(this.fontSlider.value, 10) || 32, 8);
      this.ctx.font = `${fontSize}px Inter, sans-serif`;
      const width = this.ctx.measureText(text).width;
      const height = fontSize * 1.2;
      const opacity = (parseInt(this.textOpacity.value, 10) || 70) / 100;
      return { type: 'text', text, fontSize, width, height, opacity, color: this.colorInput.value || '#ffffff' };
    }

    if (this.mode === 'logo' && this.logoImage) {
      const percent = Math.max(parseInt(this.logoScale.value, 10) || 50, 5) / 100;
      const width = this.canvas.width * percent;
      const aspect = this.logoImage.height / this.logoImage.width;
      const height = width * aspect;
      const opacity = (parseInt(this.logoOpacity.value, 10) || 70) / 100;
      return { type: 'logo', width, height, opacity, image: this.logoImage };
    }

    return null;
  }

  getPosition(width, height) {
    const padding = 16;
    const option = this.positionSelect.value;
    if (option === 'drag') {
      if (!this.dragPosition) {
        this.dragPosition = {
          x: (this.canvas.width - width) / 2,
          y: (this.canvas.height - height) / 2
        };
      }
      return this.clampPosition(this.dragPosition.x, this.dragPosition.y, width, height);
    }

    const positions = {
      'top-left': { x: padding, y: padding },
      'top-right': { x: this.canvas.width - width - padding, y: padding },
      'bottom-left': { x: padding, y: this.canvas.height - height - padding },
      'bottom-right': { x: this.canvas.width - width - padding, y: this.canvas.height - height - padding },
      center: { x: (this.canvas.width - width) / 2, y: (this.canvas.height - height) / 2 }
    };

    return this.clampPosition(
      (positions[option] || positions['bottom-right']).x,
      (positions[option] || positions['bottom-right']).y,
      width,
      height
    );
  }

  clampPosition(x, y, width, height) {
    const maxX = Math.max(this.canvas.width - width, 0);
    const maxY = Math.max(this.canvas.height - height, 0);
    return {
      x: Math.min(Math.max(0, x), maxX),
      y: Math.min(Math.max(0, y), maxY)
    };
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.baseImage) return;
    this.ctx.drawImage(this.baseImage, 0, 0, this.canvas.width, this.canvas.height);
    const descriptor = this.getDescriptor();
    if (!descriptor) return;
    const position = this.getPosition(descriptor.width, descriptor.height);

    if (descriptor.type === 'text') {
      this.ctx.font = `${descriptor.fontSize}px Inter, sans-serif`;
      this.ctx.textBaseline = 'top';
      this.ctx.fillStyle = hexToRgba(descriptor.color, descriptor.opacity);
      this.ctx.fillText(descriptor.text, position.x, position.y);
    } else {
      this.ctx.globalAlpha = descriptor.opacity;
      this.ctx.drawImage(descriptor.image, position.x, position.y, descriptor.width, descriptor.height);
      this.ctx.globalAlpha = 1;
    }
  }

  download() {
    if (!this.baseImage) return;
    const descriptor = this.getDescriptor();
    if (!descriptor) {
      showStatus('Configure a watermark first', 'warning');
      return;
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.baseImage.width;
    exportCanvas.height = this.baseImage.height;
    const ctx = exportCanvas.getContext('2d');
    ctx.drawImage(this.baseImage, 0, 0);

    const position = this.getPosition(descriptor.width, descriptor.height);
    const scale = this.scaleFactor || 1;
    const actual = {
      x: position.x / scale,
      y: position.y / scale,
      width: descriptor.width / scale,
      height: descriptor.height / scale
    };

    if (descriptor.type === 'text') {
      ctx.font = `${descriptor.fontSize / scale}px Inter, sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillStyle = hexToRgba(descriptor.color, descriptor.opacity);
      ctx.fillText(descriptor.text, actual.x, actual.y);
    } else {
      ctx.globalAlpha = descriptor.opacity;
      ctx.drawImage(descriptor.image, actual.x, actual.y, actual.width, actual.height);
      ctx.globalAlpha = 1;
    }

    exportCanvas.toBlob((blob) => {
      if (!blob) {
        showStatus('Unable to export watermark', 'error');
        return;
      }
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = 'sigma-sora-watermark.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showStatus('Watermarked image downloaded', 'success');
    }, 'image/png', 1);
  }

  reset() {
    this.baseImage = null;
    this.logoImage = null;
    this.scaleFactor = 1;
    this.dragging = false;
    this.baseInput.value = '';
    this.logoInput.value = '';
    this.textInput.value = '';
    this.colorInput.value = '#ffffff';
    this.fontSlider.value = 32;
    this.textOpacity.value = 70;
    this.logoScale.value = 50;
    this.logoOpacity.value = 70;
    this.positionSelect.value = 'drag';
    this.modeRadios.forEach(radio => {
      radio.checked = radio.value === 'text';
    });
    this.setMode('text');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.downloadBtn.disabled = true;
    this.resetBtn.disabled = true;
    this.dragPosition = null;
  }
}

function hexToRgba(hex, alpha) {
  const value = hex.replace('#', '');
  if (value.length !== 6) {
    return `rgba(255,255,255,${alpha})`;
  }
  const bigint = parseInt(value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
