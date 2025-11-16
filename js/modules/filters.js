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
        
        this.init();
    }
    
    init() {
        // Initialize filter listeners
        Object.keys(this.filters).forEach(filterName => {
            const filter = this.filters[filterName];
            const valueDisplay = document.getElementById(`${filterName}-value`);
            
            filter.element.addEventListener('input', debounce(() => {
                filter.value = filter.element.value;
                valueDisplay.textContent = `${filter.value}%`;
                this.applyFilters();
            }, 50));
        });
        
        // Reset button
        this.resetBtn.addEventListener('click', () => this.resetFilters());
        
        // Listen for image and dimension changes
        document.addEventListener('imageLoaded', () => this.applyFilters());
        document.addEventListener('dimensionsChanged', () => this.applyFilters());
    }
    
    resetFilters() {
        this.filters.brightness.element.value = 100;
        this.filters.contrast.element.value = 100;
        this.filters.saturate.element.value = 100;
        this.filters.grayscale.element.value = 0;
        this.filters.sepia.element.value = 0;
        
        Object.keys(this.filters).forEach(filterName => {
            this.filters[filterName].value = this.filters[filterName].element.value;
            const valueDisplay = document.getElementById(`${filterName}-value`);
            valueDisplay.textContent = `${this.filters[filterName].value}%`;
        });
        
        this.applyFilters();
    }
    
    applyFilters() {
        const uploadManager = window.uploadManager;
        const sizeCalculator = window.sizeCalculator;
        
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
            this.getFilterValues()
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
            brightness: this.filters.brightness.value,
            contrast: this.filters.contrast.value,
            saturate: this.filters.saturate.value,
            grayscale: this.filters.grayscale.value,
            sepia: this.filters.sepia.value
        };
    }
}