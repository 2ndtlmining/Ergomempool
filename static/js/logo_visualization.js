// logo_visualization.js - ERGO Block Visualization with Byte-Based Block Representation

// ERGO Block Configuration - Based on real ERGO specifications
const ERGO_BLOCK_CONFIG = {
    // ERGO block specifications
    maxBlockSizeBytes: 2000000, // 2MB = 2,000,000 bytes
    
    // Visual configuration
    hexagonRadius: 180,
    centerX: 200,
    centerY: 200,
    canvasWidth: 400,
    canvasHeight: 400,
    
    // Byte representation
    bytesPerPixel: 1000, // Each small block represents 1000 bytes (1KB)
    minTransactionSize: 4, // Minimum pixels for a transaction (4KB)
    maxTransactionSize: 100, // Maximum pixels for a transaction (100KB)
};

// Global state for byte-based visualization
let byteGrid = [];
let currentBlockUsage = 0;
let placedTransactions = [];
let animationQueue = [];

/**
 * Main function to create byte-based ERGO block visualization
 */
function createERGOBlockVisualization() {
    console.log('🔷 Creating ERGO Block Visualization');
    
    const grid = document.getElementById('mempool-grid');
    grid.innerHTML = '';
    
    // Setup container
    setupERGOBlockContainer(grid);
    
    if (transactions.length === 0) {
        grid.innerHTML = '<div class="loading">Loading ERGO block visualization...</div>';
        return;
    }

    // Calculate current mempool size
    const mempoolSizeBytes = transactions.reduce((sum, tx) => sum + (tx.size || 0), 0);
    const blockUtilization = (mempoolSizeBytes / ERGO_BLOCK_CONFIG.maxBlockSizeBytes) * 100;
    
    // Create title with block stats
    const titleContainer = createERGOBlockStatsTitle(mempoolSizeBytes, blockUtilization);
    grid.appendChild(titleContainer);

    // Create the hexagon container with byte grid
    const logoContainer = createERGOBlockHexagonContainer();
    grid.appendChild(logoContainer);
    
    // Initialize byte grid
    initializeERGOByteGrid();
    
    // Pack transactions as byte chunks
    packTransactionsAsERGOBytes(logoContainer, transactions);
    
    // Handle overflow if mempool exceeds block size
    if (mempoolSizeBytes > ERGO_BLOCK_CONFIG.maxBlockSizeBytes) {
        createERGOOverflowVisualization(grid, mempoolSizeBytes);
    }
    
    // Add real-time byte counter animation
    animateERGOByteCounter();
}

/**
 * Setup the main container for ERGO block visualization
 */
function setupERGOBlockContainer(grid) {
    grid.style.display = 'flex';
    grid.style.flexDirection = 'column';
    grid.style.alignItems = 'center';
    grid.style.justifyContent = 'flex-start';
    grid.style.padding = '20px';
    grid.style.gap = '20px';
    grid.style.position = 'relative';
    grid.style.minHeight = '700px';
}

/**
 * Create title with block statistics
 */
function createERGOBlockStatsTitle(mempoolSize, utilization) {
    const container = document.createElement('div');
    container.className = 'ergo-block-stats-container';
    container.style.cssText = `
        text-align: center;
        color: #e8731f;
        animation: ergoBlockStatsSlideIn 1s ease-out;
    `;
    
    // Main title
    const title = document.createElement('h2');
    title.textContent = 'ERGO Block Formation';
    title.style.cssText = `
        margin: 0 0 10px 0;
        font-size: 24px;
        font-weight: bold;
        text-shadow: 0 2px 4px rgba(232, 115, 31, 0.3);
    `;
    
    // Statistics display
    const stats = document.createElement('div');
    stats.className = 'ergo-byte-stats';
    stats.innerHTML = `
        <div class="ergo-stat-row">
            <span class="ergo-stat-label">Block Capacity:</span>
            <span class="ergo-stat-value">${formatERGOBytes(ERGO_BLOCK_CONFIG.maxBlockSizeBytes)}</span>
        </div>
        <div class="ergo-stat-row">
            <span class="ergo-stat-label">Mempool Size:</span>
            <span class="ergo-stat-value" id="ergo-current-mempool-size">${formatERGOBytes(mempoolSize)}</span>
        </div>
        <div class="ergo-stat-row">
            <span class="ergo-stat-label">Utilization:</span>
            <span class="ergo-stat-value ${utilization > 100 ? 'overflow' : ''}" id="ergo-block-utilization">
                ${utilization.toFixed(1)}%
            </span>
        </div>
    `;
    stats.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 5px;
        font-size: 14px;
        margin-top: 10px;
    `;
    
    container.appendChild(title);
    container.appendChild(stats);
    
    return container;
}

/**
 * Create hexagon container with byte grid infrastructure
 */
function createERGOBlockHexagonContainer() {
    const container = document.createElement('div');
    container.className = 'ergo-byte-hexagon-container';
    container.style.cssText = `
        position: relative;
        width: ${ERGO_BLOCK_CONFIG.canvasWidth}px;
        height: ${ERGO_BLOCK_CONFIG.canvasHeight}px;
        margin: 20px;
    `;
    
    // Create SVG overlay for hexagon and sigma
    const svg = createERGOHexagonSVG();
    container.appendChild(svg);
    
    // Create byte grid canvas
    const byteCanvas = createERGOByteGridCanvas();
    container.appendChild(byteCanvas);
    
    // Create transaction overlay
    const transactionOverlay = document.createElement('div');
    transactionOverlay.className = 'ergo-transaction-overlay';
    transactionOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10;
        pointer-events: none;
    `;
    container.appendChild(transactionOverlay);
    
    return container;
}

/**
 * Create SVG for hexagon and sigma outlines
 */
function createERGOHexagonSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', ERGO_BLOCK_CONFIG.canvasWidth);
    svg.setAttribute('height', ERGO_BLOCK_CONFIG.canvasHeight);
    svg.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        z-index: 15;
        pointer-events: none;
    `;
    
    // Create hexagon path
    const hexagonPath = createERGOHexagonPath();
    const hexagon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hexagon.setAttribute('d', hexagonPath);
    hexagon.setAttribute('fill', 'none');
    hexagon.setAttribute('stroke', '#e8731f');
    hexagon.setAttribute('stroke-width', '3');
    hexagon.setAttribute('opacity', '0.9');
    hexagon.style.animation = 'ergoHexagonDrawBytes 3s ease-out';
    svg.appendChild(hexagon);
    
    // Create sigma symbol
    const sigmaPath = createERGOSigmaPath();
    const sigma = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    sigma.setAttribute('d', sigmaPath);
    sigma.setAttribute('fill', 'none');
    sigma.setAttribute('stroke', '#d4651b');
    sigma.setAttribute('stroke-width', '4');
    sigma.setAttribute('opacity', '0.8');
    sigma.style.animation = 'ergoSigmaDrawBytes 2s ease-out 1.5s both';
    svg.appendChild(sigma);
    
    return svg;
}

/**
 * Create the byte grid canvas for fine-grained byte representation
 */
function createERGOByteGridCanvas() {
    const canvas = document.createElement('canvas');
    canvas.className = 'ergo-byte-grid-canvas';
    canvas.width = ERGO_BLOCK_CONFIG.canvasWidth;
    canvas.height = ERGO_BLOCK_CONFIG.canvasHeight;
    canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        z-index: 5;
        border-radius: 8px;
    `;
    
    return canvas;
}

/**
 * Initialize the byte grid data structure
 */
function initializeERGOByteGrid() {
    byteGrid = [];
    const gridSize = 2; // Each grid cell represents bytesPerPixel bytes
    
    for (let x = 0; x < ERGO_BLOCK_CONFIG.canvasWidth; x += gridSize) {
        byteGrid[x] = byteGrid[x] || [];
        for (let y = 0; y < ERGO_BLOCK_CONFIG.canvasHeight; y += gridSize) {
            const isInsideHexagon = isPointInsideERGOHexagon(x, y);
            const isInsideSigma = isPointInsideERGOSigma(x, y);
            
            byteGrid[x][y] = {
                available: isInsideHexagon && !isInsideSigma,
                occupied: false,
                transactionId: null,
                bytes: 0
            };
        }
    }
    
    console.log('📊 Initialized ERGO byte grid for', Object.keys(byteGrid).length, 'columns');
}

/**
 * Check if a point is inside the hexagon
 */
function isPointInsideERGOHexagon(x, y) {
    const { centerX, centerY, hexagonRadius } = ERGO_BLOCK_CONFIG;
    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    return distance <= (hexagonRadius - 20); // 20px buffer from edges
}

/**
 * Check if a point is inside the sigma symbol area
 */
function isPointInsideERGOSigma(x, y) {
    const { centerX, centerY } = ERGO_BLOCK_CONFIG;
    const relX = x - centerX;
    const relY = y - centerY;
    
    // Simple approximation of sigma area
    const sigmaBuffer = 12;
    if (Math.abs(relX) < 45 && Math.abs(relY) < 55) {
        // Check for sigma lines with buffer
        if (Math.abs(relY) < sigmaBuffer || // Horizontal lines
            (Math.abs(relX) > 35 && Math.abs(relY) < 30)) { // Vertical edges
            return true;
        }
    }
    return false;
}

/**
 * Pack transactions as byte-accurate representations
 */
function packTransactionsAsERGOBytes(container, transactions) {
    const canvas = container.querySelector('.ergo-byte-grid-canvas');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    currentBlockUsage = 0;
    placedTransactions = [];
    animationQueue = [];
    
    // Sort transactions by size (largest first for better packing)
    const sortedTransactions = [...transactions].sort((a, b) => (b.size || 0) - (a.size || 0));
    
    let animationDelay = 2.5; // Start after hexagon/sigma animations
    
    for (const tx of sortedTransactions) {
        const txSizeBytes = tx.size || 0;
        
        // Check if transaction fits in remaining block space
        if (currentBlockUsage + txSizeBytes > ERGO_BLOCK_CONFIG.maxBlockSizeBytes) {
            console.log(`⚠️ Transaction ${tx.id.substring(0, 8)} too large for remaining space`);
            break;
        }
        
        // Calculate how many pixels this transaction needs
        const pixelsNeeded = Math.max(
            ERGO_BLOCK_CONFIG.minTransactionSize, 
            Math.min(
                ERGO_BLOCK_CONFIG.maxTransactionSize,
                Math.ceil(txSizeBytes / ERGO_BLOCK_CONFIG.bytesPerPixel)
            )
        );
        
        // Find available space for this transaction
        const placement = findAvailableERGOByteSpace(pixelsNeeded);
        
        if (placement) {
            // Mark space as occupied
            markERGOByteSpaceAsOccupied(placement, tx.id, txSizeBytes);
            
            // Add to animation queue
            animationQueue.push({
                transaction: tx,
                placement: placement,
                delay: animationDelay,
                sizeBytes: txSizeBytes
            });
            
            currentBlockUsage += txSizeBytes;
            animationDelay += 0.05;
        }
    }
    
    // Start byte filling animation
    animateERGOByteFillingProcess(ctx);
    
    console.log(`📦 Packed ${placedTransactions.length} transactions using ${formatERGOBytes(currentBlockUsage)}`);
}

/**
 * Find available space for a transaction of given pixel size
 */
function findAvailableERGOByteSpace(pixelsNeeded) {
    const { centerX, centerY } = ERGO_BLOCK_CONFIG;
    const gridSize = 2;
    const maxAttempts = 200;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Try spiral pattern from center
        const angle = (attempt * 2.4) % (2 * Math.PI);
        const radius = (attempt / maxAttempts) * 150;
        
        const startX = Math.floor((centerX + Math.cos(angle) * radius) / gridSize) * gridSize;
        const startY = Math.floor((centerY + Math.sin(angle) * radius) / gridSize) * gridSize;
        
        // Try to place a rectangular block
        const placement = tryERGOByteRectangularPlacement(startX, startY, pixelsNeeded, gridSize);
        if (placement) {
            return placement;
        }
    }
    
    return null;
}

/**
 * Try to place a rectangular block of pixels
 */
function tryERGOByteRectangularPlacement(startX, startY, pixelsNeeded, gridSize) {
    // Try different aspect ratios
    const aspectRatios = [1, 1.5, 2, 0.5, 0.75];
    
    for (const ratio of aspectRatios) {
        const width = Math.ceil(Math.sqrt(pixelsNeeded * ratio));
        const height = Math.ceil(pixelsNeeded / width);
        
        if (canPlaceERGOByteRectangle(startX, startY, width * gridSize, height * gridSize, gridSize)) {
            return {
                x: startX,
                y: startY,
                width: width * gridSize,
                height: height * gridSize,
                pixels: width * height
            };
        }
    }
    
    return null;
}

/**
 * Check if a rectangle can be placed at given position
 */
function canPlaceERGOByteRectangle(x, y, width, height, gridSize) {
    for (let dx = 0; dx < width; dx += gridSize) {
        for (let dy = 0; dy < height; dy += gridSize) {
            const checkX = x + dx;
            const checkY = y + dy;
            
            if (!byteGrid[checkX] || !byteGrid[checkX][checkY] || 
                !byteGrid[checkX][checkY].available || 
                byteGrid[checkX][checkY].occupied) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Mark space as occupied by a transaction
 */
function markERGOByteSpaceAsOccupied(placement, transactionId, sizeBytes) {
    const gridSize = 2;
    
    for (let dx = 0; dx < placement.width; dx += gridSize) {
        for (let dy = 0; dy < placement.height; dy += gridSize) {
            const x = placement.x + dx;
            const y = placement.y + dy;
            
            if (byteGrid[x] && byteGrid[x][y]) {
                byteGrid[x][y].occupied = true;
                byteGrid[x][y].transactionId = transactionId;
                byteGrid[x][y].bytes = sizeBytes / placement.pixels; // Distribute bytes evenly
            }
        }
    }
    
    placedTransactions.push({
        id: transactionId,
        placement: placement,
        sizeBytes: sizeBytes
    });
}

/**
 * Animate the byte filling process
 */
function animateERGOByteFillingProcess(ctx) {
    let animationIndex = 0;
    
    const animateNext = () => {
        if (animationIndex >= animationQueue.length) return;
        
        const item = animationQueue[animationIndex];
        drawERGOTransactionBytes(ctx, item);
        
        animationIndex++;
        setTimeout(animateNext, 50); // 50ms between each transaction animation
    };
    
    setTimeout(animateNext, 2500); // Start after SVG animations
}

/**
 * Draw transaction bytes on canvas with animation
 */
function drawERGOTransactionBytes(ctx, item) {
    const { placement, transaction, sizeBytes } = item;
    
    // Get color based on current color mode
    const maxSize = Math.max(...transactions.map(tx => tx.size || 0));
    const maxValue = Math.max(...transactions.map(tx => tx.value || 0));
    
    const color = colorMode === 'size' 
        ? getColorBySize(transaction.size || 0, maxSize)
        : getColorByValue(transaction.value || 0, maxValue);
    
    // Draw with slight transparency to show density
    ctx.fillStyle = color + '80'; // Add alpha
    ctx.fillRect(placement.x, placement.y, placement.width, placement.height);
    
    // Add border for definition
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(placement.x, placement.y, placement.width, placement.height);
    
    // Add size label for larger transactions
    if (sizeBytes > 5000) { // 5KB+
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        const text = formatERGOBytes(sizeBytes);
        ctx.fillText(text, placement.x + placement.width/2, placement.y + placement.height/2);
    }
}

/**
 * Create overflow visualization for large mempools
 */
function createERGOOverflowVisualization(grid, mempoolSize) {
    const excessBytes = mempoolSize - ERGO_BLOCK_CONFIG.maxBlockSizeBytes;
    const excessTransactions = transactions.filter(tx => 
        !placedTransactions.some(placed => placed.id === tx.id)
    );
    
    const overflowContainer = document.createElement('div');
    overflowContainer.className = 'ergo-mempool-overflow';
    overflowContainer.style.cssText = `
        text-align: center;
        padding: 20px;
        border: 2px dashed #e8731f;
        border-radius: 10px;
        background: rgba(232, 115, 31, 0.1);
        margin-top: 20px;
        animation: ergoOverflowAlert 2s ease-out 4s both;
    `;
    
    overflowContainer.innerHTML = `
        <h3 style="color: #e8731f; margin: 0 0 10px 0;">
            ⚠️ Mempool Overflow
        </h3>
        <p style="color: #d4651b; margin: 0 0 10px 0;">
            <strong>${formatERGOBytes(excessBytes)}</strong> exceeds block capacity
        </p>
        <p style="color: #999; margin: 0; font-size: 12px;">
            ${excessTransactions.length} transactions awaiting next block
        </p>
    `;
    
    grid.appendChild(overflowContainer);
}

/**
 * Animate real-time byte counter
 */
function animateERGOByteCounter() {
    const counter = document.getElementById('ergo-current-mempool-size');
    const utilization = document.getElementById('ergo-block-utilization');
    
    if (!counter || !utilization) return;
    
    let currentBytes = 0;
    const targetBytes = currentBlockUsage;
    const increment = targetBytes / 50; // 50 animation steps
    
    const updateCounter = () => {
        currentBytes = Math.min(currentBytes + increment, targetBytes);
        counter.textContent = formatERGOBytes(currentBytes);
        
        const utilPercent = (currentBytes / ERGO_BLOCK_CONFIG.maxBlockSizeBytes) * 100;
        utilization.textContent = utilPercent.toFixed(1) + '%';
        
        if (utilPercent > 100) {
            utilization.classList.add('overflow');
        }
        
        if (currentBytes < targetBytes) {
            requestAnimationFrame(updateCounter);
        }
    };
    
    setTimeout(() => {
        requestAnimationFrame(updateCounter);
    }, 3000);
}

/**
 * Create hexagon path for ERGO block visualization
 */
function createERGOHexagonPath() {
    const { centerX, centerY, hexagonRadius } = ERGO_BLOCK_CONFIG;
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
 * Create sigma path for ERGO block visualization
 */
function createERGOSigmaPath() {
    const { centerX, centerY } = ERGO_BLOCK_CONFIG;
    const width = 70;
    const height = 90;
    
    const left = centerX - width / 2;
    const right = centerX + width / 2;
    const top = centerY - height / 2;
    const bottom = centerY + height / 2;
    const midY = centerY;
    
    return `
        M ${left} ${top}
        L ${right} ${top}
        L ${centerX} ${midY}
        L ${right} ${bottom}
        L ${left} ${bottom}
        L ${centerX - 15} ${midY}
        L ${left} ${top}
    `;
}

/**
 * Format bytes to human readable format
 */
function formatERGOBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Add CSS animations and styles for ERGO block visualization
 */
function addERGOBlockVisualizationStyles() {
    if (document.querySelector('#ergo-block-visualization-styles')) {
        return;
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = 'ergo-block-visualization-styles';
    styleElement.textContent = `
        @keyframes ergoBlockStatsSlideIn {
            0% { 
                opacity: 0; 
                transform: translateY(-20px);
            }
            100% { 
                opacity: 1; 
                transform: translateY(0);
            }
        }
        
        @keyframes ergoHexagonDrawBytes {
            0% { 
                stroke-dasharray: 1200;
                stroke-dashoffset: 1200;
                opacity: 0;
            }
            100% { 
                stroke-dasharray: 1200;
                stroke-dashoffset: 0;
                opacity: 0.9;
            }
        }
        
        @keyframes ergoSigmaDrawBytes {
            0% { 
                stroke-dasharray: 600;
                stroke-dashoffset: 600;
                opacity: 0;
            }
            100% { 
                stroke-dasharray: 600;
                stroke-dashoffset: 0;
                opacity: 0.8;
            }
        }
        
        @keyframes ergoOverflowAlert {
            0% { 
                opacity: 0; 
                transform: scale(0.9);
            }
            50% {
                transform: scale(1.05);
            }
            100% { 
                opacity: 1; 
                transform: scale(1);
            }
        }
        
        .ergo-byte-hexagon-container {
            filter: drop-shadow(0 4px 20px rgba(232, 115, 31, 0.2));
            transition: all 0.3s ease;
        }
        
        .ergo-byte-hexagon-container:hover {
            filter: drop-shadow(0 6px 25px rgba(232, 115, 31, 0.3));
            transform: scale(1.01);
        }
        
        .ergo-stat-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 2px 0;
        }
        
        .ergo-stat-label {
            color: #bdc3c7;
            font-size: 12px;
        }
        
        .ergo-stat-value {
            color: #e8731f;
            font-weight: bold;
            font-size: 13px;
        }
        
        .ergo-stat-value.overflow {
            color: #e74c3c;
            animation: ergoPulse 1s infinite;
        }
        
        @keyframes ergoPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        .ergo-mempool-overflow {
            box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
        }
        
        @media (max-width: 768px) {
            .ergo-byte-hexagon-container {
                transform: scale(0.8);
            }
            
            .ergo-block-stats-container h2 {
                font-size: 20px !important;
            }
        }
        
        @media (max-width: 480px) {
            .ergo-byte-hexagon-container {
                transform: scale(0.7);
            }
            
            .ergo-block-stats-container h2 {
                font-size: 18px !important;
            }
        }
    `;
    document.head.appendChild(styleElement);
}

// Initialize styles
addERGOBlockVisualizationStyles();

// Export the main function
if (typeof window !== 'undefined') {
    window.createERGOBlockVisualization = createERGOBlockVisualization;
    window.formatERGOBytes = formatERGOBytes;
}