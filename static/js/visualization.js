// visualization.js - Clean mempool visualization with 2 modes: Grid and ERGO Block

// Configuration for transaction type detection
const TRANSACTION_TYPES = {
    DONATION: {
        icon: '💖',
        color: '#e74c3c',
        addresses: ['9hF8coEmr6Mnfh3gexuwnnU816kbW8qrVBoUraJC5Zb79T9DRnx']
    },
    TEST: {
        icon: '🧪',
        color: '#f39c12',
    },
    REGULAR: {
        icon: '',
        color: null
    }
};

// Track test transactions by storing their IDs when they're created
let testTransactionIds = new Set();

// Visualization mode - only 'grid' or 'ergo-block'
let visualizationMode = 'grid';

/**
 * Registers a transaction as a test transaction
 */
function trackSpecialTransaction(txId, type = 'test') {
    if (type === 'test') {
        testTransactionIds.add(txId);
        console.log(`🧪 Registered test transaction: ${txId}`);
        
        // Refresh to show the new transaction
        setTimeout(() => {
            if (typeof loadTransactions === 'function') {
                console.log('🔄 Refreshing transactions to show new test transaction');
                loadTransactions();
            }
        }, 1000);
    }
}

/**
 * Identifies the type of transaction based on outputs
 */
function identifyTransactionType(transaction) {
    // Check test transactions first
    if (testTransactionIds.has(transaction.id)) {
        return TRANSACTION_TYPES.TEST;
    }
    
    // Check if any output goes to donation address
    if (transaction.outputs && transaction.outputs.length > 0) {
        for (const output of transaction.outputs) {
            if (output.address && TRANSACTION_TYPES.DONATION.addresses.includes(output.address)) {
                return TRANSACTION_TYPES.DONATION;
            }
        }
    }
    
    return TRANSACTION_TYPES.REGULAR;
}

/**
 * Get color based on transaction size
 */
function getColorBySize(size, maxSize) {
    const normalized = Math.min(size / maxSize, 1);
    const index = Math.floor(normalized * (sizeColors.length - 1));
    return sizeColors[index];
}

/**
 * Get color based on transaction value
 */
function getColorByValue(value, maxValue) {
    const normalized = Math.min(value / maxValue, 1);
    const index = Math.floor(normalized * (valueColors.length - 1));
    return valueColors[index];
}

/**
 * Calculate square size based on value
 */
function getSquareSize(value, maxValue, minSize = 8, maxSizePixels = 24) {
    const normalized = Math.min(value / maxValue, 1);
    return Math.max(minSize, Math.floor(minSize + (maxSizePixels - minSize) * normalized));
}

/**
 * Create a transaction square element for grid mode
 */
function createTransactionSquare(tx, maxSize, maxValue) {
    const square = document.createElement('div');
    square.className = 'transaction-square';
    square.style.position = 'relative';
    
    // Identify transaction type
    const transactionType = identifyTransactionType(tx);
    
    const size = getSquareSize(colorMode === 'size' ? tx.size : tx.value, 
                             colorMode === 'size' ? maxSize : maxValue);
    
    const color = colorMode === 'size' 
        ? getColorBySize(tx.size || 0, maxSize)
        : getColorByValue(tx.value || 0, maxValue);

    square.style.width = `${size}px`;
    square.style.height = `${size}px`;
    square.style.backgroundColor = color;
    square.style.borderRadius = '3px';
    square.style.cursor = 'pointer';
    square.style.transition = 'all 0.3s ease';

    // Add transaction type styling and data attributes
    if (transactionType.color) {
        square.dataset.type = transactionType === TRANSACTION_TYPES.DONATION ? 'donation' : 'test';
        square.style.border = `2px solid ${transactionType.color}`;
    }

    // Check if this transaction involves the connected wallet
    if (walletConnector.isConnected && walletConnector.connectedAddress) {
        if (isWalletTransaction(tx, walletConnector.connectedAddress)) {
            square.classList.add('wallet-transaction');
            square.style.border = '3px solid #f39c12';
            square.style.boxShadow = '0 0 15px rgba(243, 156, 18, 0.9), 0 0 30px rgba(243, 156, 18, 0.6), 0 0 45px rgba(243, 156, 18, 0.3)';
            square.style.zIndex = '10';
            square.style.position = 'relative';
            square.style.animation = 'walletGlow 2s ease-in-out infinite alternate';
        }
    }

    // Add transaction type icon if it has one
    if (transactionType.icon) {
        const iconOverlay = document.createElement('div');
        iconOverlay.className = 'transaction-type-icon';
        iconOverlay.textContent = transactionType.icon;
        iconOverlay.style.cssText = `
            position: absolute;
            top: 1px;
            right: 1px;
            font-size: ${Math.min(size * 0.4, 12)}px;
            z-index: 20;
            pointer-events: none;
            text-shadow: 0 0 3px rgba(0,0,0,0.8);
            filter: drop-shadow(0 0 2px rgba(255,255,255,0.3));
            line-height: 1;
        `;
        square.appendChild(iconOverlay);
    }

    // Add hover events for tooltip
    square.addEventListener('mouseenter', (e) => {
        showTooltipEnhanced(e, tx, transactionType);
    });

    square.addEventListener('mouseleave', () => {
        hideTooltip();
    });

    // Add click event to open transaction in new tab
    square.addEventListener('click', () => {
        window.open(`https://sigmaspace.io/en/transaction/${tx.id}`, '_blank');
    });

    return square;
}

/**
 * Create the main mempool grid visualization
 */
function createGridVisualization() {
    const grid = document.getElementById('mempool-grid');
    grid.innerHTML = '';
    
    // Reset grid styles to original
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(8px, 1fr))';
    grid.style.gridTemplateRows = 'auto';
    grid.style.gap = '2px';
    grid.style.padding = '15px';
    grid.style.flexDirection = '';
    grid.style.alignItems = '';
    grid.style.justifyContent = '';
    grid.style.minHeight = '300px';

    if (transactions.length === 0) {
        grid.innerHTML = '<div class="loading">No transactions available</div>';
        return;
    }

    const maxSize = Math.max(...transactions.map(tx => tx.size || 0));
    const maxValue = Math.max(...transactions.map(tx => tx.value || 0));

    // Limit to first 500 transactions for performance
    const displayTransactions = transactions.slice(0, 500);

    displayTransactions.forEach((tx, index) => {
        const square = createTransactionSquare(tx, maxSize, maxValue);
        
        const size = getSquareSize(colorMode === 'size' ? tx.size : tx.value, 
                                 colorMode === 'size' ? maxSize : maxValue);
        
        square.style.gridColumn = `span ${Math.max(1, Math.floor(size / 8))}`;
        square.style.gridRow = `span ${Math.max(1, Math.floor(size / 8))}`;

        grid.appendChild(square);
    });
}

/**
 * Main visualization function - chooses between grid and ERGO block mode
 */
function createVisualization() {
    console.log(`🎨 Creating visualization in ${visualizationMode} mode`);
    
    if (visualizationMode === 'ergo-block') {
        // Use the byte-based ERGO block visualization from logo_visualization.js
        if (typeof window.createERGOBlockVisualization === 'function') {
            window.createERGOBlockVisualization();
        } else {
            console.error('❌ ERGO Block visualization not loaded. Make sure logo_visualization.js is included.');
            console.log('🔄 Falling back to grid view');
            visualizationMode = 'grid';
            createGridVisualization();
        }
    } else {
        // Default grid visualization
        createGridVisualization();
    }
}

/**
 * Enhanced tooltip function that shows transaction type
 */
function showTooltipEnhanced(event, tx, transactionType) {
    const tooltip = document.getElementById('tooltip');
    const usdValue = tx.usd_value || 0;
    const shortId = shortenTransactionId(tx.id, 8, 8);
    
    // Check if this is a wallet transaction
    const isWalletTx = walletConnector.isConnected && walletConnector.connectedAddress && 
                      isWalletTransaction(tx, walletConnector.connectedAddress);
    
    let walletInfo = '';
    if (isWalletTx) {
        walletInfo = '<div style="color: #f39c12; font-weight: bold; margin-bottom: 4px;">🌟 Your Wallet Transaction</div>';
    }
    
    // Add transaction type info
    let typeInfo = '';
    if (transactionType === TRANSACTION_TYPES.DONATION) {
        typeInfo = '<div style="color: #e74c3c; font-weight: bold; margin-bottom: 4px;">💖 Donation Transaction</div>';
    } else if (transactionType === TRANSACTION_TYPES.TEST) {
        typeInfo = '<div style="color: #f39c12; font-weight: bold; margin-bottom: 4px;">🧪 Test Transaction</div>';
    }
    
    tooltip.innerHTML = `
        ${walletInfo}
        ${typeInfo}
        <strong>Transaction</strong><br>
        ID: ${shortId}<br>
        Size: ${tx.size || 'N/A'} bytes<br>
        Value: ${(tx.value || 0).toFixed(4)} ERG<br>
        Value: ${usdValue.toFixed(2)} USD
    `;
    tooltip.style.display = 'block';
    tooltip.style.left = event.pageX + 10 + 'px';
    tooltip.style.top = event.pageY - 10 + 'px';
}

/**
 * Show tooltip on transaction hover (legacy function for compatibility)
 */
function showTooltip(event, tx) {
    const transactionType = identifyTransactionType(tx);
    showTooltipEnhanced(event, tx, transactionType);
}

/**
 * Hide the transaction tooltip
 */
function hideTooltip() {
    document.getElementById('tooltip').style.display = 'none';
}

/**
 * Initialize visualization controls with 2 modes only
 */
function initializeVisualizationControls() {
    const controlsDiv = document.querySelector('.controls');
    
    // Add ERGO Block view toggle button
    const ergoBlockButton = document.createElement('button');
    ergoBlockButton.className = 'control-button';
    ergoBlockButton.id = 'ergo-block-toggle';
    ergoBlockButton.innerHTML = '📦 ERGO Block';
    ergoBlockButton.title = 'View mempool as bytes filling an ERGO block (2MB capacity)';
    
    // Insert the button before refresh button
    const refreshButton = document.getElementById('refresh-data');
    controlsDiv.insertBefore(ergoBlockButton, refreshButton);
    
    ergoBlockButton.addEventListener('click', function() {
        if (visualizationMode === 'grid') {
            visualizationMode = 'ergo-block';
            this.textContent = '📊 Grid View';
            this.classList.add('active');
        } else {
            visualizationMode = 'grid';
            this.textContent = '📦 ERGO Block';
            this.classList.remove('active');
        }
        createVisualization();
    });
    
    // Keep existing color mode controls
    document.getElementById('color-by-size').addEventListener('click', function() {
        colorMode = 'size';
        document.querySelectorAll('.control-button').forEach(btn => {
            if (btn.id !== 'ergo-block-toggle') btn.classList.remove('active');
        });
        this.classList.add('active');
        createVisualization();
    });

    document.getElementById('color-by-value').addEventListener('click', function() {
        colorMode = 'value';
        document.querySelectorAll('.control-button').forEach(btn => {
            if (btn.id !== 'ergo-block-toggle') btn.classList.remove('active');
        });
        this.classList.add('active');
        createVisualization();
    });
}

// Add CSS styles for transaction type icons and enhancements
function addTransactionIconStyles() {
    if (document.querySelector('#transaction-icon-styles')) {
        return; // Styles already added
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = 'transaction-icon-styles';
    styleElement.textContent = `
        .transaction-square {
            transition: all 0.3s ease;
        }
        
        .transaction-type-icon {
            animation: iconPulse 2s infinite ease-in-out;
        }
        
        @keyframes iconPulse {
            0%, 100% { 
                transform: scale(1); 
                opacity: 0.9;
            }
            50% { 
                transform: scale(1.1); 
                opacity: 1;
            }
        }
        
        .transaction-square[data-type="donation"] {
            animation: donationGlow 3s infinite ease-in-out;
        }
        
        .transaction-square[data-type="test"] {
            animation: testGlow 2s infinite ease-in-out;
        }
        
        @keyframes donationGlow {
            0%, 100% { 
                box-shadow: 0 0 8px #e74c3c40;
            }
            50% { 
                box-shadow: 0 0 12px #e74c3c80;
            }
        }
        
        @keyframes testGlow {
            0%, 100% { 
                box-shadow: 0 0 8px #f39c1240;
            }
            50% { 
                box-shadow: 0 0 12px #f39c1280;
            }
        }
        
        /* Enhanced hover effects for special transactions */
        .transaction-square[data-type="donation"]:hover,
        .transaction-square[data-type="test"]:hover {
            transform: scale(1.05);
            z-index: 100;
        }
        
        /* ERGO Block toggle button styling */
        #ergo-block-toggle {
            background: linear-gradient(135deg, #e8731f 0%, #d4651b 100%);
            color: white;
            border: 2px solid #f39c12;
            position: relative;
            overflow: hidden;
        }
        
        #ergo-block-toggle:hover {
            background: linear-gradient(135deg, #d4651b 0%, #e8731f 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(232, 115, 31, 0.4);
        }
        
        #ergo-block-toggle.active {
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
            border-color: #27ae60;
            animation: ergoButtonPulse 2s infinite ease-in-out;
        }
        
        @keyframes ergoButtonPulse {
            0%, 100% { 
                box-shadow: 0 0 0 0 rgba(39, 174, 96, 0.7);
            }
            50% { 
                box-shadow: 0 0 0 10px rgba(39, 174, 96, 0);
            }
        }
        
        /* Enhanced control button layout */
        .controls {
            flex-wrap: wrap;
            justify-content: center;
            gap: 8px;
        }
        
        .control-button {
            min-width: 110px;
            font-size: 13px;
            padding: 8px 12px;
        }
        
        @media (max-width: 768px) {
            .control-button {
                min-width: 90px;
                font-size: 12px;
                padding: 6px 10px;
            }
        }
    `;
    document.head.appendChild(styleElement);
}

// Initialize styles when the script loads
addTransactionIconStyles();

// Export functions for use in other modules
if (typeof window !== 'undefined') {
    window.trackSpecialTransaction = trackSpecialTransaction;
}