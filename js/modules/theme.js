/**
 * Theme Module - Handles dark/light theme switching
 */

class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.sunIcon = document.getElementById('sun-icon');
        this.moonIcon = document.getElementById('moon-icon');
        this.htmlElement = document.documentElement;
        
        this.init();
    }
    
    init() {
        // Load saved theme or default to dark
        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.setTheme(savedTheme);
        
        // Add event listener
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }
    
    setTheme(theme) {
        if (theme === 'dark') {
            this.htmlElement.classList.add('dark');
            this.moonIcon.classList.remove('hidden');
            this.sunIcon.classList.add('hidden');
        } else {
            this.htmlElement.classList.remove('dark');
            this.sunIcon.classList.remove('hidden');
            this.moonIcon.classList.add('hidden');
        }
        
        localStorage.setItem('theme', theme);
    }
    
    toggleTheme() {
        const currentTheme = this.htmlElement.classList.contains('dark') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Add rotation animation
        const icon = currentTheme === 'dark' ? this.moonIcon : this.sunIcon;
        icon.style.animation = 'spin-slow 0.5s ease-in-out';
        
        setTimeout(() => {
            this.setTheme(newTheme);
            icon.style.animation = '';
        }, 250);
    }
}