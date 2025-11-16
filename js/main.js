/**
 * Main Application Entry Point
 */

// Global instances
let themeManager, modeManager, uploadManager, sizeCalculator, trimManager, filtersManager, converterManager;

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    try {
        // Initialize all modules
        themeManager = new ThemeManager();
        modeManager = new ModeManager();
        uploadManager = new UploadManager();
        sizeCalculator = new SizeCalculator();
        trimManager = new TrimManager();
        filtersManager = new FiltersManager();
        converterManager = new ConverterManager();
        
        // Make managers globally accessible for inter-module communication
        window.modeManager = modeManager;
        window.uploadManager = uploadManager;
        window.sizeCalculator = sizeCalculator;
        window.trimManager = trimManager;
        window.filtersManager = filtersManager;
        window.converterManager = converterManager;
        
        console.log('Sigma-Sora Convert initialized successfully');
        
        // Add keyboard shortcuts
        initializeKeyboardShortcuts();
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showStatus('Failed to initialize application', 'error');
    }
}

function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + O: Open file
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            document.getElementById('file-input').click();
        }
        
        // Ctrl/Cmd + S: Save/Download
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const downloadBtn = document.getElementById('download-btn');
            if (!downloadBtn.disabled) {
                downloadBtn.click();
            }
        }
        
        // Ctrl/Cmd + R: Reset filters
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            document.getElementById('reset-filters').click();
        }
    });
}

// Performance monitoring
if ('performance' in window && 'memory' in performance) {
    setInterval(() => {
        const memory = performance.memory;
        const used = (memory.usedJSHeapSize / 1048576).toFixed(2);
        const total = (memory.totalJSHeapSize / 1048576).toFixed(2);
        console.log(`Memory: ${used}MB / ${total}MB`);
    }, 10000);
}