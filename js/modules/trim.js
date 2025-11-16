class TrimManager {
    constructor() {
        this.buttons = document.querySelectorAll('[data-trim]');
        this.activePreset = 'original';
        this.cropRect = null;
        this.presets = {
            original: { label: 'Original', ratio: null },
            square: { label: '1:1 Square', ratio: 1 },
            fourFive: { label: '4:5 Portrait', ratio: 4 / 5 },
            sixteenNine: { label: '16:9 Landscape', ratio: 16 / 9 },
            stories: { label: '9:16 Story', ratio: 9 / 16 },
            cinema: { label: '21:9 Cinema', ratio: 21 / 9 }
        };

        this.init();
    }

    init() {
        if (this.buttons.length === 0) {
            return;
        }

        this.buttons.forEach(button => {
            button.addEventListener('click', () => {
                const presetKey = button.getAttribute('data-trim');
                this.selectPreset(presetKey);
            });
        });

        document.addEventListener('imageLoaded', () => {
            this.cropRect = null;
            this.activePreset = 'original';
            this.updateButtonState();
        });
    }

    selectPreset(key) {
        if (!key || !this.presets[key]) {
            return;
        }

        const uploadManager = window.uploadManager;
        if (!uploadManager || !uploadManager.getOriginalImage()) {
            showStatus('Upload an image before trimming', 'warning');
            return;
        }

        const originalImage = uploadManager.getOriginalImage();

        if (!this.presets[key].ratio) {
            this.cropRect = null;
            this.activePreset = 'original';
            window.sizeCalculator?.resetToOriginalDimensions();
            this.updateButtonState();
            document.dispatchEvent(new CustomEvent('trimChanged', { detail: { preset: key, cropRect: null } }));
            return;
        }

        const cropRect = this.calculateCropRect(originalImage, this.presets[key].ratio);
        this.cropRect = cropRect;
        this.activePreset = key;

        if (cropRect && window.sizeCalculator) {
            window.sizeCalculator.applyAspectDimensions(cropRect.sw, cropRect.sh);
        }

        this.updateButtonState();
        document.dispatchEvent(new CustomEvent('trimChanged', { detail: { preset: key, cropRect } }));
    }

    calculateCropRect(image, ratio) {
        const sourceRatio = image.width / image.height;
        let sx = 0;
        let sy = 0;
        let sw = image.width;
        let sh = image.height;

        if (sourceRatio > ratio) {
            // Image is wider than target ratio, trim width
            sh = image.height;
            sw = sh * ratio;
            sx = (image.width - sw) / 2;
        } else {
            // Image is taller, trim height
            sw = image.width;
            sh = sw / ratio;
            sy = (image.height - sh) / 2;
        }

        return {
            sx: Math.round(sx),
            sy: Math.round(sy),
            sw: Math.round(sw),
            sh: Math.round(sh)
        };
    }

    updateButtonState() {
        this.buttons.forEach(button => {
            const key = button.getAttribute('data-trim');
            button.classList.toggle('active', key === this.activePreset);
        });
    }

    getCropRect() {
        return this.cropRect;
    }
}
