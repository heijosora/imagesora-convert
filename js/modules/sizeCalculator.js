/**
 * Size Calculator Module - Handles dimension calculations and aspect ratio
 */

class SizeCalculator {
    constructor() {
        this.widthPx = document.getElementById('width-px');
        this.heightPx = document.getElementById('height-px');
        this.widthCm = document.getElementById('width-cm');
        this.heightCm = document.getElementById('height-cm');
        this.dpiInput = document.getElementById('dpi');
        this.aspectLockBtn = document.getElementById('aspect-lock');
        this.lockIcon = document.getElementById('lock-icon');
        this.unlockIcon = document.getElementById('unlock-icon');
        
        this.aspectRatio = 1;
        this.isLocked = true;
        this.originalDimensions = { width: 0, height: 0 };
        
        this.init();
    }
    
    init() {
        // Aspect ratio lock toggle
        this.aspectLockBtn.addEventListener('click', () => this.toggleAspectLock());
        
        // Width change
        this.widthPx.addEventListener('input', debounce(() => {
            if (this.isLocked && this.widthPx.value) {
                const newWidth = parseInt(this.widthPx.value);
                const newHeight = Math.round(newWidth / this.aspectRatio);
                this.heightPx.value = newHeight;
            }
            this.updateCmValues();
            this.triggerResize();
        }, 300));
        
        // Height change
        this.heightPx.addEventListener('input', debounce(() => {
            if (this.isLocked && this.heightPx.value) {
                const newHeight = parseInt(this.heightPx.value);
                const newWidth = Math.round(newHeight * this.aspectRatio);
                this.widthPx.value = newWidth;
            }
            this.updateCmValues();
            this.triggerResize();
        }, 300));
        
        // DPI change
        this.dpiInput.addEventListener('input', debounce(() => {
            this.updateCmValues();
        }, 300));
        
        // Listen for image load
        document.addEventListener('imageLoaded', (e) => {
            this.setDimensions(e.detail.image.width, e.detail.image.height);
        });
    }
    
    toggleAspectLock() {
        this.isLocked = !this.isLocked;
        
        if (this.isLocked) {
            this.lockIcon.classList.remove('hidden');
            this.unlockIcon.classList.add('hidden');
            this.lockIcon.parentElement.classList.remove('text-gray-400');
            this.lockIcon.parentElement.classList.add('text-blue-500');
            
            // Recalculate aspect ratio
            if (this.widthPx.value && this.heightPx.value) {
                this.aspectRatio = parseInt(this.widthPx.value) / parseInt(this.heightPx.value);
            }
        } else {
            this.lockIcon.classList.add('hidden');
            this.unlockIcon.classList.remove('hidden');
            this.unlockIcon.parentElement.classList.add('text-gray-400');
            this.unlockIcon.parentElement.classList.remove('text-blue-500');
        }
    }
    
    setDimensions(width, height) {
        this.originalDimensions = { width, height };
        this.aspectRatio = width / height;
        
        this.widthPx.value = width;
        this.heightPx.value = height;
        
        this.updateCmValues();
    }
    
    updateCmValues() {
        const dpi = parseInt(this.dpiInput.value) || 300;
        const width = parseInt(this.widthPx.value) || 0;
        const height = parseInt(this.heightPx.value) || 0;
        
        this.widthCm.value = pixelsToCm(width, dpi);
        this.heightCm.value = pixelsToCm(height, dpi);
    }
    
    triggerResize() {
        const width = parseInt(this.widthPx.value) || this.originalDimensions.width;
        const height = parseInt(this.heightPx.value) || this.originalDimensions.height;
        
        document.dispatchEvent(new CustomEvent('dimensionsChanged', {
            detail: { width, height }
        }));
    }
    
    getCurrentDimensions() {
        return {
            width: parseInt(this.widthPx.value) || this.originalDimensions.width,
            height: parseInt(this.heightPx.value) || this.originalDimensions.height
        };
    }
}