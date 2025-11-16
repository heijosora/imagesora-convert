/**
 * Filters Module - Handles image filters and color correction
 */

class FiltersManager {
    constructor() {
        this.filters = {
            brightness: { element: document.getElementById('brightness'), value: 100 },
            contrast: { element: document.getElementById('contrast'), value: 100 },
            saturate: { element: document.getElementById('saturate'), value: 100 },
            grayscale: { element: document.getElementById('grayscale'), value: 0 },
            sepia: { element: document.getElementById('sepia'), value: 0 }
        };
        
        this.resetBtn = document.getElementById('reset-filters');
        this.previewCanvas = document.getElementById('preview-canvas');
        this.noPreview = document.getElementById('no-preview');
        this.presetButtons = document.querySelectorAll('[data-preset]');
        this.quickFilterSelect = document.getElementById('quick-filter');
        this.activePreset = 'original';
        this.presets = {
            original: { brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0 },
            vivid: { brightness: 105, contrast: 115, saturate: 130, grayscale: 0, sepia: 0 },
            sunset: { brightness: 110, contrast: 105, saturate: 120, grayscale: 0, sepia: 15 },
            retro: { brightness: 95, contrast: 90, saturate: 90, grayscale: 10, sepia: 25 },
            mono: { brightness: 105, contrast: 120, saturate: 0, grayscale: 100, sepia: 0 },
            soft: { brightness: 108, contrast: 95, saturate: 105, grayscale: 0, sepia: 5 }
        };
        
        this.init();
    }
    
    init() {
        // Initialize filter listeners
        Object.keys(this.filters).forEach(filterName => {
            const filter = this.filters[filterName];
            const valueDisplay = document.getElementById(`${filterName}-value`);
            
            filter.element.addEventListener('input', debounce(() => {
                filter.value = parseInt(filter.element.value, 10);
                valueDisplay.textContent = `${filter.value}%`;
                this.clearPresetSelection();
                this.applyFilters();
            }, 50));
        });
        
        // Reset button
        this.resetBtn.addEventListener('click', () => this.resetFilters());
        
        // Listen for image and dimension changes
        document.addEventListener('imageLoaded', () => this.applyFilters());
        document.addEventListener('dimensionsChanged', () => this.applyFilters());
        document.addEventListener('trimChanged', () => this.applyFilters());
        document.addEventListener('modeChanged', (event) => {
            if (event.detail.mode === 'quick') {
                const fallback = this.presets[this.activePreset] ? this.activePreset : 'original';
                this.applyPreset(fallback);
            }
        });

        this.bindPresetControls();
        this.bindQuickFilter();
        this.updatePresetHighlight();
        this.applyPreset('original');
    }
    
    resetFilters() {
        this.applyPreset('original');
    }
    
    applyFilters() {
        const uploadManager = window.uploadManager;
        const sizeCalculator = window.sizeCalculator;
        const trimManager = window.trimManager;
        
        if (!uploadManager || !uploadManager.getOriginalImage()) {
            return;
        }
        
        const originalImage = uploadManager.getOriginalImage();
        const dimensions = sizeCalculator ? sizeCalculator.getCurrentDimensions() : 
                          { width: originalImage.width, height: originalImage.height };
        
        // Create canvas with filters
        const canvas = createCanvasFromImage(
            originalImage,
            dimensions.width,
            dimensions.height,
            this.getFilterValues(),
            trimManager ? trimManager.getCropRect() : null
        );
        
        // Update preview
        this.updatePreview(canvas);
    }
    
    updatePreview(canvas) {
        const ctx = this.previewCanvas.getContext('2d');
        
        // Calculate preview size (max 300px height, maintain aspect ratio)
        const maxHeight = 300;
        const scale = Math.min(1, maxHeight / canvas.height);
        const previewWidth = canvas.width * scale;
        const previewHeight = canvas.height * scale;
        
        this.previewCanvas.width = previewWidth;
        this.previewCanvas.height = previewHeight;
        
        ctx.drawImage(canvas, 0, 0, previewWidth, previewHeight);
        
        this.previewCanvas.classList.remove('hidden');
        this.noPreview.classList.add('hidden');
    }
    
    getFilterValues() {
        return {
            brightness: Number(this.filters.brightness.value),
            contrast: Number(this.filters.contrast.value),
            saturate: Number(this.filters.saturate.value),
            grayscale: Number(this.filters.grayscale.value),
            sepia: Number(this.filters.sepia.value)
        };
    }

    bindPresetControls() {
        if (!this.presetButtons) {
            return;
        }

        this.presetButtons.forEach(button => {
            button.addEventListener('click', () => {
                const preset = button.getAttribute('data-preset');
                this.applyPreset(preset);
            });
        });
    }

    bindQuickFilter() {
        if (!this.quickFilterSelect) {
            return;
        }

        this.quickFilterSelect.addEventListener('change', (event) => {
            const preset = event.target.value;
            this.applyPreset(preset, { skipQuickSync: true });
        });
    }

    applyPreset(presetName, options = {}) {
        const preset = this.presets[presetName];
        if (!preset) {
            return;
        }

        Object.entries(preset).forEach(([key, value]) => {
            if (!this.filters[key]) {
                return;
            }
            this.filters[key].element.value = value;
            this.filters[key].value = value;
            const valueDisplay = document.getElementById(`${key}-value`);
            if (valueDisplay) {
                valueDisplay.textContent = `${value}%`;
            }
        });

        this.activePreset = presetName;
        this.updatePresetHighlight();

        if (this.quickFilterSelect && !options.skipQuickSync) {
            this.quickFilterSelect.value = presetName;
        }

        this.applyFilters();
    }

    clearPresetSelection() {
        this.activePreset = null;
        this.updatePresetHighlight();
    }

    updatePresetHighlight() {
        if (!this.presetButtons) {
            return;
        }
        this.presetButtons.forEach(button => {
            const preset = button.getAttribute('data-preset');
            button.classList.toggle('active', preset === this.activePreset);
        });
    }
}