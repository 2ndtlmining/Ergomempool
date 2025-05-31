// main.js - Main application coordination and initialization

// Global application state
let transactions = [];
let colorMode = 'size';
let currentPrice = 0;

// Color palettes for different visualization modes
const sizeColors = [
    '#27ae60', '#2ecc71', '#f1c40f', '#e67e22', '#e74c3c', '#8e44ad'
];

const valueColors = [
    '#3498db', '#2980b9', '#9b59b6', '#8e44ad', '#e74c3c', '#c0392b'
];

/**
 * Initialize refresh button event listener
 */
function initializeRefreshButton() {
    document.getElementById('refresh-data').addEventListener('click', function() {
        this.textContent = 'Refreshing...';
        loadTransactions();
        loadBlockLabels();
        loadPrice();
        setTimeout(() => {
            this.textContent = 'Refresh Data';
        }, 1000);
    });
}

/**
 * Initialize all application data loading and intervals
 */
function initializeDataLoading() {
    // Initial data load
    loadPrice();
    loadTransactions();
    loadBlockLabels();
    
    // Set up auto-refresh intervals
    // Refresh transactions and blocks every 30 seconds
    setInterval(() => {
        loadTransactions();
        loadBlockLabels();
    }, 30000);

    // Refresh price every 5 minutes
    setInterval(() => {
        loadPrice();
    }, 300000);
}

/**
 * Main application initialization
 * Sets up all modules and starts the application
 */
function initializeApplication() {
    // Initialize all modules
    initializeWalletConnection();
    initializeVisualizationControls();
    initializeRefreshButton();
    
    // Start data loading
    initializeDataLoading();
    
    console.log('Ergomempool application initialized successfully');
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApplication);