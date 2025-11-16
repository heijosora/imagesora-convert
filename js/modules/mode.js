class ModeManager {
    constructor() {
        this.body = document.body;
        this.toggleButtons = document.querySelectorAll('[data-mode-toggle]');
        this.description = document.getElementById('mode-description');
        this.descriptions = {
            quick: 'Quick mode limits tools to format, size, and one curated filter for instant posts.',
            advanced: 'Advanced mode unlocks presets, trim controls, and batch-ready adjustments.'
        };
        this.currentMode = '';
        this.init();
    }

    init() {
        if (this.toggleButtons.length === 0) {
            return;
        }

        this.toggleButtons.forEach(button => {
            button.addEventListener('click', () => {
                const mode = button.getAttribute('data-mode-toggle');
                this.setMode(mode);
            });
        });

        // Default to advanced for full control on load
        this.setMode('advanced', true);
    }

    setMode(mode, force = false) {
        if (!mode) {
            return;
        }
        if (this.currentMode === mode && !force) {
            return;
        }

        this.currentMode = mode;
        this.body.classList.remove('mode-quick', 'mode-advanced');
        this.body.classList.add(`mode-${mode}`);

        this.toggleButtons.forEach(button => {
            const isActive = button.getAttribute('data-mode-toggle') === mode;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', `${isActive}`);
        });

        if (this.description && this.descriptions[mode]) {
            this.description.textContent = this.descriptions[mode];
        }

        document.dispatchEvent(new CustomEvent('modeChanged', {
            detail: { mode }
        }));
    }
}
