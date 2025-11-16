/**
 * Helper Functions for Sigma-Sora Convert
 */

// Format file size to human-readable format
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Convert pixels to centimeters
function pixelsToCm(pixels, dpi) {
    return (pixels / dpi * 2.54).toFixed(2);
}

// Convert centimeters to pixels
function cmToPixels(cm, dpi) {
    return Math.round(cm * dpi / 2.54);
}

// Calculate aspect ratio
function calculateAspectRatio(width, height) {
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    return {
        ratio: width / height,
        simplified: `${width / divisor}:${height / divisor}`
    };
}

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show status message
function showStatus(message, type = 'info') {
    const container = document.getElementById('status-container');
    const messageEl = document.getElementById('status-message');
    
    container.classList.remove('hidden');
    messageEl.textContent = message;
    
    // Reset classes
    messageEl.className = 'p-4 rounded-lg text-sm fade-in';
    
    // Add type-specific classes
    switch(type) {
        case 'success':
            messageEl.classList.add('bg-green-100', 'dark:bg-green-900/20', 'text-green-700', 'dark:text-green-400');
            break;
        case 'error':
            messageEl.classList.add('bg-red-100', 'dark:bg-red-900/20', 'text-red-700', 'dark:text-red-400');
            break;
        case 'warning':
            messageEl.classList.add('bg-yellow-100', 'dark:bg-yellow-900/20', 'text-yellow-700', 'dark:text-yellow-400');
            break;
        default:
            messageEl.classList.add('bg-blue-100', 'dark:bg-blue-900/20', 'text-blue-700', 'dark:text-blue-400');
    }
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        container.classList.add('hidden');
    }, 3000);
}

// Validate image file
function validateImageFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (!validTypes.includes(file.type)) {
        throw new Error('Please upload a valid image file (JPEG, PNG, GIF, WebP, BMP)');
    }
    
    if (file.size > maxSize) {
        throw new Error('File size must be less than 50MB');
    }
    
    return true;
}

// Load image from file
function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const img = new Image();
        
        reader.onload = (e) => {
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = e.target.result;
        };
        
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Create canvas from image with filters
function createCanvasFromImage(img, width, height, filters = {}) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = width;
    canvas.height = height;
    
    // Apply filters
    const filterString = Object.entries(filters)
        .map(([key, value]) => {
            switch(key) {
                case 'brightness':
                case 'contrast':
                case 'saturate':
                    return `${key}(${value}%)`;
                case 'grayscale':
                case 'sepia':
                    return value > 0 ? `${key}(${value}%)` : '';
                default:
                    return '';
            }
        })
        .filter(f => f)
        .join(' ');
    
    if (filterString) {
        ctx.filter = filterString;
    }
    
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
}

// Binary search for target file size
async function compressToTargetSize(canvas, targetSizeBytes, format, minQuality = 0.1, maxQuality = 1.0) {
    let low = minQuality;
    let high = maxQuality;
    let bestBlob = null;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (low <= high && attempts < maxAttempts) {
        const mid = (low + high) / 2;
        
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, `image/${format}`, mid);
        });
        
        if (blob.size <= targetSizeBytes) {
            bestBlob = blob;
            low = mid + 0.01;
        } else {
            high = mid - 0.01;
        }
        
        attempts++;
    }
    
    return bestBlob;
}