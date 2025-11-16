/**
 * Upload Module - Handles file upload and drag-drop functionality
 */

class UploadManager {
    constructor() {
        this.dropZone = document.getElementById('drop-zone');
        this.fileInput = document.getElementById('file-input');
        this.browseBtn = document.getElementById('browse-btn');
        this.fileInfo = document.getElementById('file-info');
        this.currentFile = null;
        this.originalImage = null;
        
        this.init();
    }
    
    init() {
        // Browse button click
        this.browseBtn.addEventListener('click', () => this.fileInput.click());
        
        // File input change
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0]);
            }
        });
        
        // Drag and drop events
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('drop-active');
        });
        
        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone.classList.remove('drop-active');
        });
        
        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('drop-active');
            
            if (e.dataTransfer.files.length > 0) {
                this.handleFile(e.dataTransfer.files[0]);
            }
        });
    }
    
    async handleFile(file) {
        try {
            // Validate file
            validateImageFile(file);
            
            this.currentFile = file;
            
            // Load image
            this.originalImage = await loadImageFromFile(file);
            
            // Update file info
            this.updateFileInfo(file, this.originalImage);
            
            // Trigger events for other modules
            document.dispatchEvent(new CustomEvent('imageLoaded', {
                detail: {
                    file: file,
                    image: this.originalImage
                }
            }));
            
            showStatus('Image loaded successfully', 'success');
            
        } catch (error) {
            showStatus(error.message, 'error');
            console.error('Upload error:', error);
        }
    }
    
    updateFileInfo(file, image) {
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-resolution').textContent = `${image.width} × ${image.height}`;
        document.getElementById('file-size').textContent = formatFileSize(file.size);
        this.fileInfo.classList.remove('hidden');
    }
    
    getOriginalImage() {
        return this.originalImage;
    }
    
    getCurrentFile() {
        return this.currentFile;
    }
}