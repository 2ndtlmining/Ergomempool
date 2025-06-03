// ergo-packing.js - Simplified ERGO Block Packing - Always Show Packed Transactions

// Simplified ERGO Block Packing Configuration
const ERGO_PACKING_CONFIG = {
    maxBlockSizeBytes: 2097152, // 2MB
    
    // Visual configuration
    hexagonRadius: 216,
    centerX: 240,
    centerY: 240,
    canvasWidth: 480,
    canvasHeight: 480,
    
    // Transaction square configuration
    minSquareSize: 4,
    maxSquareSize: 18,
    squareSpacing: 1,
    
    // Size scaling
    bytesToPixelRatio: 900,
    
    // Animation timing
    packingAnimationSpeed: 80,
    
    // NEW: Hybrid packing configuration
    gridPackingProbability: 0.7,  // 70% grid, 30% random
    randomAttemptsLimit: 150,      // Max attempts for random positioning
    hybridMode: true               // Enable hybrid packing
};

// SIMPLIFIED Global state - only what we need
let currentPackingContainer = null;
let availableSpaces = [];
let packedTransactionIds = new Set(); // Track which transactions are already packed
let currentBlockUsage = 0; // Track current block usage

/**
 * Main function to create ERGO block packing visualization
 * Creates the container and packs initial transactions
 */
function createERGOPackingVisualization() {
    console.log('📦 === STARTING ERGO PACKING VISUALIZATION ===');
    console.log(`📊 Total transactions: ${transactions ? transactions.length : 'undefined'}`);
    console.log('🔍 Global transactions variable:', typeof transactions, Array.isArray(transactions));
    
    const grid = document.getElementById('mempool-grid');
    if (!grid) {
        console.error('❌ CRITICAL: mempool-grid element not found!');
        return;
    }
    
    console.log('✅ Found mempool-grid element');
    
    // Clear existing content
    grid.innerHTML = '';
    console.log('🧹 Cleared existing grid content');
    
    // Always create the container, even if no transactions
    const mainContainer = document.createElement('div');
    mainContainer.className = 'ergo-packing-simplified-container';
    console.log('📦 Created main container');
    
    const hexagonContainer = createLargeERGOHexagonContainer();
    console.log('🔷 Created hexagon container');
    
    mainContainer.appendChild(hexagonContainer);
    grid.appendChild(mainContainer);
    console.log('✅ Added containers to DOM');
    
    // Initialize packing system
    initializePackingSystem();
    currentPackingContainer = hexagonContainer;
    console.log('🏗️ Initialized packing system');
    
    if (!transactions || transactions.length === 0) {
        console.log('📦 No transactions to pack - showing empty hexagon');
        
        // Add a loading message inside the hexagon
        const packingArea = hexagonContainer.querySelector('.ergo-packing-area');
        if (packingArea) {
            packingArea.innerHTML = '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #e8731f; font-size: 14px; text-align: center;">No transactions<br>to pack</div>';
        }
        return;
    }
    
    console.log(`📦 Packing ${transactions.length} transactions`);
    
    // Pack all current transactions (initial load)
    packAllTransactions();
    
    // Handle overflow display
    updateOverflowDisplay(grid);
    
    console.log('✅ === ERGO PACKING VISUALIZATION COMPLETE ===');
}

/**
 * Pack only new transactions (incremental packing)
 */
function packNewTransactions(newTransactions) {
    console.log(`📦 Packing ${newTransactions.length} new transactions incrementally`);
    
    if (!currentPackingContainer) {
        console.log('📦 No packing container exists - creating it first');
        createERGOPackingVisualization();
        
        // After creating the visualization, the new transactions will be packed as part of packAllTransactions()
        // so we don't need to continue with incremental packing here
        return;
    }
    
    const packingArea = currentPackingContainer.querySelector('.ergo-packing-area');
    if (!packingArea) {
        console.error('❌ No packing area found');
        return;
    }
    
    // Sort new transactions by size for better packing
    const sortedNew = [...newTransactions].sort((a, b) => (b.size || 0) - (a.size || 0));
    
    let packedCount = 0;
    
    // Pack each new transaction that fits
    sortedNew.forEach((tx, index) => {
        const txSizeBytes = tx.size || 0;
        
        // Check if transaction fits in remaining block space
        if (currentBlockUsage + txSizeBytes <= ERGO_PACKING_CONFIG.maxBlockSizeBytes) {
            // Try to pack this transaction
            const success = packSingleTransaction(packingArea, tx, index * 50); // Stagger animation
            if (success) {
                currentBlockUsage += txSizeBytes;
                packedTransactionIds.add(tx.id);
                packedCount++;
            }
        }
    });
    
    console.log(`✅ Packed ${packedCount} new transactions (total usage: ${currentBlockUsage} bytes)`);
    
    // Update overflow display
    const grid = document.getElementById('mempool-grid');
    updateOverflowDisplay(grid);
}

/**
 * Create hexagon container
 */
function createLargeERGOHexagonContainer() {
    const container = document.createElement('div');
    container.className = 'ergo-packing-hexagon-container-centered';
    
    // Create SVG hexagon
    const svg = createHexagonSVG();
    container.appendChild(svg);
    
    // Create packing area
    const packingArea = document.createElement('div');
    packingArea.className = 'ergo-packing-area';
    container.appendChild(packingArea);
    
    return container;
}

/**
 * Create SVG hexagon
 */
function createHexagonSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', ERGO_PACKING_CONFIG.canvasWidth);
    svg.setAttribute('height', ERGO_PACKING_CONFIG.canvasHeight);
    
    const hexagonPath = createHexagonPath();
    const hexagon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hexagon.setAttribute('d', hexagonPath);
    hexagon.setAttribute('fill', 'none');
    hexagon.setAttribute('stroke', '#e8731f');
    hexagon.setAttribute('stroke-width', '3');
    hexagon.setAttribute('opacity', '0.9');
    svg.appendChild(hexagon);
    
    return svg;
}

/**
 * Create hexagon path
 */
function createHexagonPath() {
    const { centerX, centerY, hexagonRadius } = ERGO_PACKING_CONFIG;
    const points = [];
    
    for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = centerX + hexagonRadius * Math.cos(angle);
        const y = centerY + hexagonRadius * Math.sin(angle);
        points.push(`${x},${y}`);
    }
    
    return `M ${points[0]} L ${points.slice(1).join(' L ')} Z`;
}

/**
 * Initialize packing system - create available positions
 */
function initializePackingSystem() {
    availableSpaces = [];
    packedTransactionIds.clear();
    currentBlockUsage = 0;
    
    const gridStep = ERGO_PACKING_CONFIG.minSquareSize + ERGO_PACKING_CONFIG.squareSpacing;
    
    // Generate grid of available positions inside hexagon
    for (let x = 50; x < ERGO_PACKING_CONFIG.canvasWidth - 50; x += gridStep) {
        for (let y = 50; y < ERGO_PACKING_CONFIG.canvasHeight - 50; y += gridStep) {
            if (isPointInsideHexagon(x, y)) {
                availableSpaces.push({ x, y, occupied: false });
            }
        }
    }
    
    console.log(`📍 Created ${availableSpaces.length} available positions`);
}

/**
 * Pack ALL current transactions (for initial load and refresh)
 */
function packAllTransactions() {
    console.log(`📦 Packing ALL ${transactions.length} transactions...`);
    
    if (!currentPackingContainer) {
        console.error('❌ No packing container available');
        return;
    }
    
    const packingArea = currentPackingContainer.querySelector('.ergo-packing-area');
    if (!packingArea) {
        console.error('❌ No packing area found');
        return;
    }
    
    // Clear existing squares and reset state
    packingArea.innerHTML = '';
    availableSpaces.forEach(space => space.occupied = false);
    packedTransactionIds.clear();
    currentBlockUsage = 0;
    
    // Sort transactions by size for better packing
    const sortedTransactions = [...transactions].sort((a, b) => (b.size || 0) - (a.size || 0));
    
    let packedCount = 0;
    
    // Pack each transaction that fits
    sortedTransactions.forEach((tx, index) => {
        const txSizeBytes = tx.size || 0;
        
        // Check if transaction fits in block
        if (currentBlockUsage + txSizeBytes <= ERGO_PACKING_CONFIG.maxBlockSizeBytes) {
            // Try to pack this transaction
            const success = packSingleTransaction(packingArea, tx, index * 30); // Stagger animation
            if (success) {
                currentBlockUsage += txSizeBytes;
                packedTransactionIds.add(tx.id);
                packedCount++;
            }
        }
    });
    
    console.log(`✅ Packed ${packedCount} transactions (${currentBlockUsage} bytes)`);
}

/**
 * Remove specific transactions (for dummy removal)
 */
function removeTransactions(transactionsToRemove) {
    console.log(`📦 Removing ${transactionsToRemove.length} transactions`);
    
    if (!currentPackingContainer) return;
    
    const packingArea = currentPackingContainer.querySelector('.ergo-packing-area');
    if (!packingArea) return;
    
    // Remove visual elements for these transactions
    transactionsToRemove.forEach(tx => {
        const element = packingArea.querySelector(`[data-tx-id="${tx.id}"]`);
        if (element) {
            // Animate out
            element.style.transform = 'scale(0)';
            element.style.opacity = '0';
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }, 300);
        }
        
        // Remove from tracking
        packedTransactionIds.delete(tx.id);
        currentBlockUsage -= (tx.size || 0);
    });
    
    // Free up the spaces these transactions occupied
    markSpacesAsAvailable(transactionsToRemove);
    
    console.log(`✅ Removed transactions, remaining usage: ${currentBlockUsage} bytes`);
}

/**
 * Mark spaces as available when transactions are removed
 */
function markSpacesAsAvailable(removedTransactions) {
    // This is a simplified approach - we could implement more precise space tracking
    // For now, we'll reset spaces that might have been occupied by removed transactions
    const numRemoved = removedTransactions.length;
    let spacesFreed = 0;
    
    // Free up some spaces proportional to removed transactions
    for (let i = availableSpaces.length - 1; i >= 0 && spacesFreed < numRemoved; i--) {
        if (availableSpaces[i].occupied) {
            availableSpaces[i].occupied = false;
            spacesFreed++;
        }
    }
    
    console.log(`📍 Freed ${spacesFreed} spaces`);
}

/**
 * Check if point is inside hexagon
 */
function isPointInsideHexagon(x, y) {
    const { centerX, centerY, hexagonRadius } = ERGO_PACKING_CONFIG;
    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    const effectiveRadius = hexagonRadius - 40; // Safety margin
    return distance <= effectiveRadius;
}

/**
 * Pack ALL current transactions - this is the main function
 */
function packAllTransactions() {
    console.log(`📦 Packing all ${transactions.length} transactions...`);
    
    if (!currentPackingContainer) {
        console.error('❌ No packing container available');
        return;
    }
    
    const packingArea = currentPackingContainer.querySelector('.ergo-packing-area');
    if (!packingArea) {
        console.error('❌ No packing area found');
        return;
    }
    
    // Clear existing squares
    packingArea.innerHTML = '';
    
    // Reset available spaces
    availableSpaces.forEach(space => space.occupied = false);
    
    // Sort transactions by size for better packing
    const sortedTransactions = [...transactions].sort((a, b) => (b.size || 0) - (a.size || 0));
    
    let currentBlockUsage = 0;
    let packedCount = 0;
    
    // Pack each transaction that fits
    sortedTransactions.forEach((tx, index) => {
        const txSizeBytes = tx.size || 0;
        
        // Check if transaction fits in block
        if (currentBlockUsage + txSizeBytes <= ERGO_PACKING_CONFIG.maxBlockSizeBytes) {
            // Try to pack this transaction
            const success = packSingleTransaction(packingArea, tx, index);
            if (success) {
                currentBlockUsage += txSizeBytes;
                packedCount++;
            }
        }
    });
    
    console.log(`✅ Packed ${packedCount} transactions (${currentBlockUsage} bytes)`);
}

/**
 * Pack a single transaction
 */
function packSingleTransaction(packingArea, transaction, animationDelay = 0) {
    // Skip if already packed
    if (packedTransactionIds.has(transaction.id)) {
        console.log(`⚠️ Transaction ${transaction.id.substring(0, 8)} already packed, skipping`);
        return false;
    }
    
    const square = createTransactionSquare(transaction);
    const position = findAvailablePosition(square.size);
    
    if (!position) {
        console.warn(`⚠️ No position found for transaction ${transaction.id.substring(0, 8)}`);
        return false;
    }
    
    // Position the square
    square.element.style.left = position.x + 'px';
    square.element.style.top = position.y + 'px';
    
    // Animate appearance
    square.element.style.transform = 'scale(0)';
    square.element.style.opacity = '0';
    
    packingArea.appendChild(square.element);
    
    // Animate in with delay
    setTimeout(() => {
        square.element.style.transform = 'scale(1)';
        square.element.style.opacity = '1';
    }, animationDelay);
    
    // Mark position as occupied
    markPositionOccupied(position, square.size);
    
    return true;
}

/**
 * Update overflow display
 */
function updateOverflowDisplay(grid) {
    // Remove existing overflow display
    const existingOverflow = grid.querySelector('.ergo-packing-overflow');
    if (existingOverflow) {
        existingOverflow.remove();
    }
    
    const mempoolSizeBytes = transactions.reduce((sum, tx) => sum + (tx.size || 0), 0);
    
    if (mempoolSizeBytes > ERGO_PACKING_CONFIG.maxBlockSizeBytes) {
        const excessBytes = mempoolSizeBytes - ERGO_PACKING_CONFIG.maxBlockSizeBytes;
        
        const overflowContainer = document.createElement('div');
        overflowContainer.className = 'ergo-packing-overflow';
        overflowContainer.innerHTML = `
            <h4 style="color: #e8731f; margin: 0 0 8px 0;">
                📦 Mempool Overflow
            </h4>
            <p style="color: #d4651b; margin: 0; font-size: 14px;">
                <strong>${formatERGOBytes(excessBytes)}</strong> exceeds block capacity
            </p>
        `;
        
        grid.appendChild(overflowContainer);
    }
}

/**
 * Public function to refresh packing visualization
 * This determines whether to pack all or just new transactions
 */
function refreshERGOPacking() {
    console.log('🔄 Refreshing ERGO packing visualization...');
    
    if (!currentPackingContainer) {
        // No container exists, create fresh
        console.log('🆕 Creating fresh visualization');
        createERGOPackingVisualization();
    } else {
        // Container exists, check what we need to do
        const currentlyPacked = packedTransactionIds.size;
        const totalTransactions = transactions.length;
        
        console.log(`📊 Currently packed: ${currentlyPacked}, Total transactions: ${totalTransactions}`);
        
        if (currentlyPacked === 0 || currentlyPacked > totalTransactions) {
            // Pack all transactions (fresh start or something went wrong)
            console.log('🔄 Packing all transactions');
            packAllTransactions();
        } else if (currentlyPacked < totalTransactions) {
            // Pack only new transactions
            const newTransactions = transactions.filter(tx => !packedTransactionIds.has(tx.id));
            console.log(`📦 Packing ${newTransactions.length} new transactions`);
            packNewTransactions(newTransactions);
        } else {
            console.log('✅ All transactions already packed');
        }
        
        // Update overflow display
        const grid = document.getElementById('mempool-grid');
        updateOverflowDisplay(grid);
    }
}

/**
 * Clear all packed transactions and reset state
 */
function clearAllPackedTransactions() {
    console.log('🧹 Clearing all packed transactions');
    
    packedTransactionIds.clear();
    currentBlockUsage = 0;
    
    if (currentPackingContainer) {
        const packingArea = currentPackingContainer.querySelector('.ergo-packing-area');
        if (packingArea) {
            packingArea.innerHTML = '';
        }
    }
    
    // Reset available spaces
    availableSpaces.forEach(space => space.occupied = false);
    
    console.log('✅ All packed transactions cleared');
}

/**
 * Hybrid packing: Mix of efficiency and randomness (configurable)
 */
function findAvailablePosition(squareSize) {
    const useGrid = Math.random() < ERGO_PACKING_CONFIG.gridPackingProbability;
    
    if (useGrid && ERGO_PACKING_CONFIG.hybridMode) {
        console.log('📍 Using grid positioning for transaction');
        
        // Try grid positions (systematic approach)
        for (const space of availableSpaces) {
            if (!space.occupied && canPlaceSquareAt(space.x, space.y, squareSize)) {
                return { x: space.x, y: space.y };
            }
        }
    } else if (ERGO_PACKING_CONFIG.hybridMode) {
        console.log('🎲 Using random positioning for transaction');
    }
    
    // Random positioning (either by choice or fallback)
    for (let attempts = 0; attempts < ERGO_PACKING_CONFIG.randomAttemptsLimit; attempts++) {
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * (ERGO_PACKING_CONFIG.hexagonRadius - 50);
        
        const x = ERGO_PACKING_CONFIG.centerX + Math.cos(angle) * distance - squareSize / 2;
        const y = ERGO_PACKING_CONFIG.centerY + Math.sin(angle) * distance - squareSize / 2;
        
        if (canPlaceSquareAt(x, y, squareSize)) {
            return { x: Math.round(x), y: Math.round(y) };
        }
    }
    
    console.warn('⚠️ No position found for transaction (hybrid packing failed)');
    return null;
}

/**
 * Pure random positioning within hexagon (helper function)
 * @param {number} squareSize - Size of the square to place
 * @returns {Object|null} - Position {x, y} or null if no space found
 */
function findRandomPositionInHexagon(squareSize) {
    for (let attempts = 0; attempts < 200; attempts++) {
        // Generate random angle and distance from center
        const angle = Math.random() * 2 * Math.PI;
        const maxDistance = ERGO_PACKING_CONFIG.hexagonRadius - 60; // Extra margin for squares
        const distance = Math.random() * maxDistance;
        
        // Convert polar to cartesian coordinates
        const x = ERGO_PACKING_CONFIG.centerX + Math.cos(angle) * distance - squareSize / 2;
        const y = ERGO_PACKING_CONFIG.centerY + Math.sin(angle) * distance - squareSize / 2;
        
        // Check if position is valid
        if (canPlaceSquareAt(x, y, squareSize)) {
            return { x: Math.round(x), y: Math.round(y) };
        }
    }
    
    return null;
}

/**
 * Enable pure grid packing (100% efficiency)
 */
function enableGridPacking() {
    ERGO_PACKING_CONFIG.gridPackingProbability = 1.0;
    ERGO_PACKING_CONFIG.hybridMode = true;
    console.log('📊 Switched to pure grid packing mode');
}

/**
 * Enable pure random packing (100% organic)
 */
function enableRandomPacking() {
    ERGO_PACKING_CONFIG.gridPackingProbability = 0.0;
    ERGO_PACKING_CONFIG.hybridMode = true;
    console.log('🎲 Switched to pure random packing mode');
}

/**
 * Enable hybrid packing (70/30 mix)
 */
function enableHybridPacking() {
    ERGO_PACKING_CONFIG.gridPackingProbability = 0.7;
    ERGO_PACKING_CONFIG.hybridMode = true;
    console.log('🔀 Switched to hybrid packing mode (70% grid, 30% random)');
}

/**
 * Disable hybrid mode (fallback to your original logic)
 */
function disableHybridPacking() {
    ERGO_PACKING_CONFIG.hybridMode = false;
    console.log('⏸️ Hybrid packing disabled');
}


/**
 * Check if square can be placed at position
 */
function canPlaceSquareAt(x, y, size) {
    // Check all corners are inside hexagon
    const corners = [
        { x: x, y: y },
        { x: x + size, y: y },
        { x: x, y: y + size },
        { x: x + size, y: y + size }
    ];
    
    for (const corner of corners) {
        if (!isPointInsideHexagon(corner.x, corner.y)) {
            return false;
        }
    }
    
    // Check for collisions with occupied spaces
    return !hasCollisionWithOccupiedSpaces(x, y, size);
}

/**
 * Check for collisions with occupied spaces
 */
function hasCollisionWithOccupiedSpaces(x, y, size) {
    const margin = ERGO_PACKING_CONFIG.squareSpacing;
    
    for (const space of availableSpaces) {
        if (space.occupied) {
            if (x < space.x + size + margin && 
                x + size + margin > space.x && 
                y < space.y + size + margin && 
                y + size + margin > space.y) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Mark position as occupied
 */
function markPositionOccupied(position, size) {
    const margin = ERGO_PACKING_CONFIG.squareSpacing;
    
    availableSpaces.forEach(space => {
        if (space.x >= position.x - margin && 
            space.x <= position.x + size + margin &&
            space.y >= position.y - margin && 
            space.y <= position.y + size + margin) {
            space.occupied = true;
        }
    });
}

/**
 * Create transaction square with styling
 */
function createTransactionSquare(transaction) {
    const sizeBytes = transaction.size || 0;
    const pixelSize = Math.sqrt(sizeBytes / ERGO_PACKING_CONFIG.bytesToPixelRatio);
    const size = Math.max(
        ERGO_PACKING_CONFIG.minSquareSize,
        Math.min(ERGO_PACKING_CONFIG.maxSquareSize, pixelSize)
    );
    
    const square = document.createElement('div');
    square.className = 'ergo-transaction-square';
    square.setAttribute('data-tx-id', transaction.id);
    
    square.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        border-radius: 2px;
        cursor: pointer;
        transition: all 0.3s ease;
        z-index: 20;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    
    // Determine color based on transaction type
    let color = '#3498db'; // Default blue
    
    if (transaction.isDummy) {
        color = transaction.dummyColor || '#e91e63'; // Pink for dummies
        square.dataset.type = 'dummy';
        square.classList.add('dummy-transaction');
    } else {
        // Use existing color functions if available
        if (typeof getColorBySize === 'function' && typeof getColorByValue === 'function') {
            const maxSize = Math.max(...transactions.map(tx => tx.size || 0));
            const maxValue = Math.max(...transactions.map(tx => tx.value || 0));
            
            color = colorMode === 'size' 
                ? getColorBySize(transaction.size || 0, maxSize)
                : getColorByValue(transaction.value || 0, maxValue);
        }
    }
    
    square.style.backgroundColor = color;
    
    // Add wallet highlighting
    if (typeof walletConnector !== 'undefined' && walletConnector.isConnected && walletConnector.connectedAddress) {
        if (typeof isWalletTransaction === 'function' && isWalletTransaction(transaction, walletConnector.connectedAddress)) {
            const borderWidth = Math.max(2, Math.min(3, Math.floor(size / 8)));
            square.style.border = `${borderWidth}px solid #f39c12`;
            square.style.boxShadow = `0 0 ${size * 0.6}px rgba(243, 156, 18, 0.8)`;
            square.style.animation = 'walletGlow 2s ease-in-out infinite alternate';
            square.style.zIndex = '50';
        }
    }
    
    // Add transaction type styling (donations, tests, etc.)
    if (!transaction.isDummy && typeof identifyTransactionType === 'function') {
        const transactionType = identifyTransactionType(transaction);
        if (transactionType.color) {
            square.style.border = `2px solid ${transactionType.color}`;
            square.style.boxShadow = `0 0 8px ${transactionType.color}40`;
            
            if (transactionType.icon) {
                const iconOverlay = document.createElement('div');
                iconOverlay.className = 'transaction-type-icon';
                iconOverlay.textContent = transactionType.icon;
                iconOverlay.style.cssText = `
                    position: absolute;
                    top: 1px;
                    right: 1px;
                    font-size: ${Math.min(size * 0.4, 10)}px;
                    z-index: 25;
                    pointer-events: none;
                    text-shadow: 0 0 3px rgba(0,0,0,0.8);
                    line-height: 1;
                `;
                square.appendChild(iconOverlay);
            }
        }
    }
    
    // Add hover events
    square.addEventListener('mouseenter', (e) => {
        if (typeof showTooltipEnhanced === 'function') {
            const transactionType = typeof identifyTransactionType === 'function' ? 
                identifyTransactionType(transaction) : { icon: '', color: null };
            showTooltipEnhanced(e, transaction, transactionType);
        } else if (typeof showTooltip === 'function') {
            showTooltip(e, transaction);
        }
        
        square.style.transform = 'scale(1.2)';
        square.style.zIndex = '100';
    });
    
    square.addEventListener('mouseleave', () => {
        if (typeof hideTooltip === 'function') {
            hideTooltip();
        }
        square.style.transform = 'scale(1)';
        square.style.zIndex = '20';
    });
    
    // Add click to open transaction
    square.addEventListener('click', () => {
        window.open(`https://sigmaspace.io/en/transaction/${transaction.id}`, '_blank');
    });
    
    return { element: square, size: size };
}

/**
 * Create overflow visualization
 */
function createOverflowVisualization(grid, mempoolSize) {
    const excessBytes = mempoolSize - ERGO_PACKING_CONFIG.maxBlockSizeBytes;
    
    const overflowContainer = document.createElement('div');
    overflowContainer.className = 'ergo-packing-overflow';
    overflowContainer.innerHTML = `
        <h4 style="color: #e8731f; margin: 0 0 8px 0;">
            📦 Mempool Overflow
        </h4>
        <p style="color: #d4651b; margin: 0; font-size: 14px;">
            <strong>${formatERGOBytes(excessBytes)}</strong> exceeds block capacity
        </p>
    `;
    
    grid.appendChild(overflowContainer);
}

/**
 * Format bytes to human readable
 */
function formatERGOBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    const value = bytes / Math.pow(k, i);
    const rounded = Math.round(value * 10) / 10;
    const display = rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
    
    return display + ' ' + sizes[i];
}

/**
 * Calculate and update ERGO packing statistics
 */
function calculateERGOPackingStats(transactions) {
    if (!transactions || transactions.length === 0) {
        return {
            blockCapacity: ERGO_PACKING_CONFIG.maxBlockSizeBytes,
            mempoolSize: 0,
            utilization: 0,
            totalTransactions: 0,
            packedTransactions: 0,
            efficiency: 0,
            status: 'No transactions in mempool',
            statusClass: 'low-efficiency'
        };
    }

    const mempoolSizeBytes = transactions.reduce((sum, tx) => sum + (tx.size || 0), 0);
    
    // Calculate how many transactions can fit
    let currentBlockUsage = 0;
    let packedTransactions = 0;
    
    const sortedTransactions = [...transactions].sort((a, b) => (b.size || 0) - (a.size || 0));
    
    for (const tx of sortedTransactions) {
        const txSize = tx.size || 0;
        if (currentBlockUsage + txSize <= ERGO_PACKING_CONFIG.maxBlockSizeBytes) {
            currentBlockUsage += txSize;
            packedTransactions++;
        } else {
            break;
        }
    }
    
    const utilization = Math.min((mempoolSizeBytes / ERGO_PACKING_CONFIG.maxBlockSizeBytes) * 100, 100);
    const efficiency = packedTransactions > 0 ? (currentBlockUsage / ERGO_PACKING_CONFIG.maxBlockSizeBytes) * 100 : 0;
    
    let status = '';
    let statusClass = '';
    
    if (efficiency < 30) {
        status = `Packing complete! ${efficiency.toFixed(1)}% efficiency`;
        statusClass = 'low-efficiency';
    } else if (efficiency < 70) {
        status = `Good packing efficiency: ${efficiency.toFixed(1)}%`;
        statusClass = 'medium-efficiency';
    } else {
        status = `Excellent packing: ${efficiency.toFixed(1)}% efficiency`;
        statusClass = 'high-efficiency';
    }
    
    return {
        blockCapacity: ERGO_PACKING_CONFIG.maxBlockSizeBytes,
        mempoolSize: mempoolSizeBytes,
        utilization: utilization,
        totalTransactions: transactions.length,
        packedTransactions: packedTransactions,
        efficiency: efficiency,
        status: status,
        statusClass: statusClass,
        currentBlockUsage: currentBlockUsage
    };
}

/**
 * Update the ERGO packing stats display
 */
function updateERGOPackingStatsDisplay(stats) {
    // Update each stat element with CORRECT IDs from your HTML
    const elements = {
        'ergo-block-capacity': formatERGOBytes(stats.blockCapacity),
        'ergo-mempool-size': formatERGOBytes(stats.mempoolSize),
        'ergo-utilization': `${stats.utilization.toFixed(1)}%`,
        'ergo-packed': stats.packedTransactions.toLocaleString()
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            console.log(`✅ Updated ${id}: ${value}`);
            
            // Add color coding for utilization
            if (id === 'ergo-utilization') {
                if (stats.utilization > 100) {
                    element.style.color = '#e74c3c';
                } else if (stats.utilization > 80) {
                    element.style.color = '#f39c12';
                } else {
                    element.style.color = '#27ae60';
                }
            }
        } else {
            console.warn(`⚠️ Element not found: ${id}`);
        }
    });
    
    console.log('📊 ERGO Packing Stats Updated:', {
        capacity: formatERGOBytes(stats.blockCapacity),
        mempool: formatERGOBytes(stats.mempoolSize),
        utilization: `${stats.utilization.toFixed(1)}%`,
        packed: stats.packedTransactions
    });
}

/**
 * Public function to refresh ERGO packing stats
 */
function refreshERGOPackingStats() {
    if (typeof transactions !== 'undefined' && Array.isArray(transactions)) {
        const stats = calculateERGOPackingStats(transactions);
        updateERGOPackingStatsDisplay(stats);
        return stats;
    }
    return null;
}

/**
 * Public function to refresh packing visualization
 * This is called when new transactions arrive or when refresh is clicked
 */
function refreshERGOPacking() {
    console.log('🔄 Refreshing ERGO packing visualization...');
    createERGOPackingVisualization();
}

// Export functions for global use
if (typeof window !== 'undefined') {
    window.createERGOPackingVisualization = createERGOPackingVisualization;
    window.refreshERGOPacking = refreshERGOPacking;
    window.packNewTransactions = packNewTransactions;
    window.removeTransactions = removeTransactions;
    window.clearAllPackedTransactions = clearAllPackedTransactions;
    window.refreshERGOPackingStats = refreshERGOPackingStats;
    window.formatERGOBytes = formatERGOBytes;
    
    // Debug functions
    window.debugERGOPacking = function() {
        console.log('🐛 === ERGO PACKING DEBUG ===');
        console.log('🔍 Function available:', typeof createERGOPackingVisualization);
        console.log('🔍 Config loaded:', ERGO_PACKING_CONFIG);
        console.log('🔍 Current container:', currentPackingContainer);
        console.log('🔍 Available spaces:', availableSpaces.length);
        console.log('🔍 Packed transactions:', packedTransactionIds.size);
        console.log('🔍 Global transactions:', typeof transactions, transactions ? transactions.length : 'undefined');
        
        // Test hexagon creation
        console.log('🧪 Testing hexagon creation...');
        try {
            createERGOPackingVisualization();
            console.log('✅ Hexagon creation test completed');
        } catch (error) {
            console.error('❌ Hexagon creation failed:', error);
        }
    };
    
    window.forceCreateHexagon = function() {
        console.log('🔨 FORCE CREATING HEXAGON...');
        const grid = document.getElementById('mempool-grid');
        if (grid) {
            grid.innerHTML = '';
            createERGOPackingVisualization();
            console.log('✅ Force hexagon creation completed');
        } else {
            console.error('❌ mempool-grid not found');
        }
    };
}

console.log('✅ Incremental ERGO Packing module loaded successfully');