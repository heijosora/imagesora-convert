/**
 * Converter Module - Handles image format conversion and compression
 */

class ConverterManager {
    constructor() {
        this.outputFormat = document.getElementById('output-format');
        this.qualityOption = document.getElementById('quality-option');
        this.sizeOption = document.getElementById('size-option');
        this.qualitySlider = document.getElementById('quality');
        this.qualityValue = document.getElementById('quality-value');
        this.targetSizeInput = document.getElementById('target-size');
        this.losslessCheckbox = document.getElementById('lossless');
        this.convertBtn = document.getElementById('convert-btn');
        this.downloadBtn = document.getElementById('download-btn');
        this.resultInfo = document.getElementById('result-info');
        
        this.qualityControls = document.getElementById('quality-controls');
        this.sizeControls = document.getElementById('size-controls');
        
        this.convertedBlob = null;
        this.convertedFileName = '';
        
        this.init();
    }
    
    init() {
        // Compression method toggle
        this.qualityOption.addEventListener('change', () => this.toggleCompressionMethod('quality'));
        this.sizeOption.addEventListener('change', () => this.toggleCompressionMethod('size'));
        
        // Quality slider
        this.qualitySlider.addEventListener('input', () => {
            this.qualityValue.textContent = `${this.qualitySlider.value}%`;
        });
        
        // Lossless checkbox
        this.losslessCheckbox.addEventListener('change', () => {
            if (this.losslessCheckbox.checked) {
                this.outputFormat.value = 'png';
                this.outputFormat.disabled = true;
                this.qualityOption.disabled = true;
                this.sizeOption.disabled = true;
                this.qualityControls.classList.add('opacity-50', 'pointer-events-none');
            } else {
                this.outputFormat.disabled = false;
                this.qualityOption.disabled = false;
                this.sizeOption.disabled = false;
                if (this.qualityOption.checked) {
                    this.qualityControls.classList.remove('opacity-50', 'pointer-events-none');
                }
            }
        });
        
        // Convert button
        this.convertBtn.addEventListener('click', () => this.convertImage());
        
        // Download button
        this.downloadBtn.addEventListener('click', () => this.downloadImage());
        
        // Enable convert button when image is loaded
        document.addEventListener('imageLoaded', () => {
            this.convertBtn.disabled = false;
        });
    }
    
    toggleCompressionMethod(method) {
        if (method === 'quality') {
            this.qualityControls.classList.remove('opacity-50', 'pointer-events-none');
            this.sizeControls.classList.add('opacity-50', 'pointer-events-none');
        } else {
            this.qualityControls.classList.add('opacity-50', 'pointer-events-none');
            this.sizeControls.classList.remove('opacity-50', 'pointer-events-none');
        }
    }
    
    async convertImage() {
        try {
            this.convertBtn.disabled = true;
            this.convertBtn.textContent = 'Converting...';
            
            const uploadManager = window.uploadManager;
            const sizeCalculator = window.sizeCalculator;
            const filtersManager = window.filtersManager;
            
            if (!uploadManager || !uploadManager.getOriginalImage()) {
                throw new Error('No image loaded');
            }
            
            const originalImage = uploadManager.getOriginalImage();
            const dimensions = sizeCalculator.getCurrentDimensions();
            const filters = filtersManager.getFilterValues();
            
            // Create canvas with current settings
            const canvas = createCanvasFromImage(
                originalImage,
                dimensions.width,
                dimensions.height,
                filters
            );
            
            // Get output format
            const format = this.outputFormat.value;
            const mimeType = `image/${format}`;
            
            // Convert based on selected method
            let blob;
            
            if (this.losslessCheckbox.checked) {
                // Lossless PNG
                blob = await new Promise(resolve => {
                    canvas.toBlob(resolve, 'image/png', 1.0);
                });
            } else if (this.sizeOption.checked) {
                // Target size compression
                const targetSizeMB = parseFloat(this.targetSizeInput.value);
                const targetSizeBytes = targetSizeMB * 1024 * 1024;
                
                blob = await compressToTargetSize(canvas, targetSizeBytes, format);
                
                if (!blob) {
                    throw new Error('Could not compress to target size');
                }
            } else {
                // Quality-based compression
                const quality = this.qualitySlider.value / 100;
                blob = await new Promise(resolve => {
                    canvas.toBlob(resolve, mimeType, quality);
                });
            }
            
            this.convertedBlob = blob;
            this.convertedFileName = this.generateFileName(uploadManager.getCurrentFile().name, format);
            
            // Update result info
            this.updateResultInfo(blob, format);
            
            // Enable download button
            this.downloadBtn.disabled = false;
            
            showStatus('Image converted successfully', 'success');
            
        } catch (error) {
            showStatus(error.message, 'error');
            console.error('Conversion error:', error);
        } finally {
            this.convertBtn.disabled = false;
            this.convertBtn.textContent = 'Convert Image';
        }
    }
    
    updateResultInfo(blob, format) {
        document.getElementById('final-size').textContent = formatFileSize(blob.size);
        document.getElementById('final-format').textContent = format;
        this.resultInfo.classList.remove('hidden');
    }
    
    generateFileName(originalName, format) {
        const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
        return `${nameWithoutExt}_converted.${format}`;
    }
    
    downloadImage() {
        if (!this.convertedBlob) return;
        
        const url = URL.createObjectURL(this.convertedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.convertedFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showStatus('Image downloaded successfully', 'success');
    }
}