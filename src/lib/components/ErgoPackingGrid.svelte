<script>
    import { transactions, walletConnector, valueColors } from '$lib/stores.js';
    import { isWalletTransaction } from '$lib/wallet.js';
    import { identifyTransactionType } from '$lib/transactionTypes.js';
    
    export let packingStats = {
        blockCapacity: 2097152,
        mempoolSize: 0,
        utilization: 0,
        totalTransactions: 0,
        packedTransactions: 0,
        efficiency: 0,
        status: 'Packing mode active',
        statusClass: 'info'
    };
    
    const ERGO_PACKING_CONFIG = {
        maxBlockSizeBytes: 2097152, // 2MB
        hexagonRadius: 180,         // Increased from 140 to 180 (+28% larger)
        centerX: 200,              // Centered in 400px container
        centerY: 200,              // Centered in 400px container
        canvasWidth: 400,
        canvasHeight: 400,
        minSquareSize: 6,          // Increased from 4 to 6 (+50% larger minimum)
        maxSquareSize: 20,         // Increased from 16 to 20 (+25% larger maximum)
        squareSpacing: 2,          // Keep same for good density
        bytesToPixelRatio: 600,    // Reduced from 800 to 600 (makes squares larger relative to transaction size)
        packingAnimationSpeed: 100
    };
    
    let packingContainer;
    let packedSquares = [];
    let availableSpaces = [];
    let packingInProgress = false;
    
    // Tooltip state
    let showTooltip = false;
    let tooltipX = 0;
    let tooltipY = 0;
    let tooltipTransaction = null;
    
    // Update stats when transactions change
    $: if ($transactions.length > 0) {
        updatePackingStats();
    }
    
    function updatePackingStats() {
        const mempoolSizeBytes = $transactions.reduce((sum, tx) => sum + (tx.size || 0), 0);
        
        // Simple packing calculation
        let currentBlockUsage = 0;
        let packedCount = 0;
        
        for (const tx of $transactions) {
            const txSize = tx.size || 0;
            if (currentBlockUsage + txSize <= ERGO_PACKING_CONFIG.maxBlockSizeBytes) {
                currentBlockUsage += txSize;
                packedCount++;
            } else {
                break;
            }
        }
        
        const utilization = Math.min((mempoolSizeBytes / ERGO_PACKING_CONFIG.maxBlockSizeBytes) * 100, 100);
        const efficiency = packedCount > 0 ? (currentBlockUsage / ERGO_PACKING_CONFIG.maxBlockSizeBytes) * 100 : 0;
        
        let status = '';
        let statusClass = '';
        
        if (efficiency < 30) {
            status = `Low packing efficiency: ${efficiency.toFixed(1)}%`;
            statusClass = 'low-efficiency';
        } else if (efficiency < 70) {
            status = `Good packing efficiency: ${efficiency.toFixed(1)}%`;
            statusClass = 'medium-efficiency';
        } else {
            status = `Excellent packing: ${efficiency.toFixed(1)}% efficiency`;
            statusClass = 'high-efficiency';
        }
        
        packingStats = {
            blockCapacity: ERGO_PACKING_CONFIG.maxBlockSizeBytes,
            mempoolSize: mempoolSizeBytes,
            utilization: utilization,
            totalTransactions: $transactions.length,
            packedTransactions: packedCount,
            efficiency: efficiency,
            status: status,
            statusClass: statusClass
        };
    }
    
    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    function shortenTransactionId(id, startChars = 8, endChars = 8) {
        if (!id || id.length <= startChars + endChars + 3) {
            return id;
        }
        return `${id.substring(0, startChars)}...${id.substring(id.length - endChars)}`;
    }
    
    // Tooltip functions
    function handleMouseEnter(event, tx) {
        tooltipTransaction = tx;
        tooltipX = event.pageX + 10;
        tooltipY = event.pageY - 10;
        showTooltip = true;
    }
    
    function handleMouseLeave() {
        showTooltip = false;
        tooltipTransaction = null;
    }
    
    function isWalletTx(tx) {
        return $walletConnector.isConnected && 
               $walletConnector.connectedAddress && 
               isWalletTransaction(tx, $walletConnector.connectedAddress);
    }
    
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
    
    function isPointInsideHexagon(x, y) {
        const { centerX, centerY, hexagonRadius } = ERGO_PACKING_CONFIG;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const effectiveRadius = hexagonRadius - 25;
        return distance <= effectiveRadius;
    }
    
    function initializePackingSystem() {
        packedSquares = [];
        availableSpaces = [];
        
        const spacing = ERGO_PACKING_CONFIG.squareSpacing;
        const minSize = ERGO_PACKING_CONFIG.minSquareSize;
        
        // Create grid of available positions
        for (let x = 40; x < ERGO_PACKING_CONFIG.canvasWidth - 40; x += minSize + spacing) {
            for (let y = 40; y < ERGO_PACKING_CONFIG.canvasHeight - 40; y += minSize + spacing) {
                if (isPointInsideHexagon(x, y)) {
                    availableSpaces.push({ x, y, occupied: false });
                }
            }
        }
        
        console.log(`📍 Mapped ${availableSpaces.length} positions inside hexagon`);
    }
    
    function findBestPackingPosition(squareSize) {
        // Try available spaces first
        for (const space of availableSpaces) {
            if (!space.occupied && canPlaceSquareAtPosition(space.x, space.y, squareSize)) {
                return { x: space.x, y: space.y };
            }
        }
        
        // Try random positions
        for (let attempts = 0; attempts < 50; attempts++) {
            const angle = Math.random() * 2 * Math.PI;
            const distance = Math.random() * (ERGO_PACKING_CONFIG.hexagonRadius - 30);
            
            const x = ERGO_PACKING_CONFIG.centerX + Math.cos(angle) * distance - squareSize / 2;
            const y = ERGO_PACKING_CONFIG.centerY + Math.sin(angle) * distance - squareSize / 2;
            
            if (canPlaceSquareAtPosition(x, y, squareSize)) {
                return { x: Math.round(x), y: Math.round(y) };
            }
        }
        
        return null;
    }
    
    function canPlaceSquareAtPosition(x, y, size) {
        // Check if all corners are inside hexagon
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
        
        return !hasCollisionWithPackedSquares(x, y, size);
    }
    
    function hasCollisionWithPackedSquares(x, y, size) {
        const spacing = ERGO_PACKING_CONFIG.squareSpacing;
        
        for (const packed of packedSquares) {
            const px = packed.position.x;
            const py = packed.position.y;
            const psize = packed.size;
            
            if (x < px + psize + spacing && 
                x + size + spacing > px && 
                y < py + psize + spacing && 
                y + size + spacing > py) {
                return true;
            }
        }
        
        return false;
    }
    
    function markSpaceAsOccupied(position, size) {
        const spacing = ERGO_PACKING_CONFIG.squareSpacing;
        
        availableSpaces.forEach(space => {
            if (space.x >= position.x - spacing && 
                space.x <= position.x + size + spacing &&
                space.y >= position.y - spacing && 
                space.y <= position.y + size + spacing) {
                space.occupied = true;
            }
        });
    }
    
    function createTransactionSquare(transaction, sizeBytes) {
        const pixelSize = Math.sqrt(sizeBytes / ERGO_PACKING_CONFIG.bytesToPixelRatio);
        const size = Math.max(
            ERGO_PACKING_CONFIG.minSquareSize,
            Math.min(ERGO_PACKING_CONFIG.maxSquareSize, pixelSize)
        );
        
        const square = document.createElement('div');
        square.className = 'ergo-transaction-square';
        square.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            border-radius: 2px;
            cursor: pointer;
            transition: all 0.3s ease;
            z-index: 20;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            backdrop-filter: blur(1px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;
        
        // Default to value-based coloring (since colorMode was removed)
        const maxValue = Math.max(...$transactions.map(tx => tx.value || 0));
        
        const getColorByValue = (value, maxValue) => {
            const normalized = Math.min(value / maxValue, 1);
            const index = Math.floor(normalized * (valueColors.length - 1));
            return valueColors[index];
        };
        
        const color = getColorByValue(transaction.value || 0, maxValue);
        square.style.backgroundColor = color;
        
        // Wallet highlighting
        if ($walletConnector.isConnected && $walletConnector.connectedAddress) {
            if (isWalletTransaction(transaction, $walletConnector.connectedAddress)) {
                square.style.border = '2px solid #f39c12';
                square.style.boxShadow = '0 0 8px rgba(243, 156, 18, 0.8)';
                square.classList.add('wallet-transaction');
            }
        }
        
        // Add transaction type styling
        const transactionType = identifyTransactionType(transaction);
        if (transactionType.color) {
            square.style.border = `1px solid ${transactionType.color}`;
            square.style.boxShadow = `0 0 8px ${transactionType.color}40`;
            
            if (transactionType.icon === '💖') {
                square.setAttribute('data-type', 'donation');
            } else if (transactionType.icon === '🧪') {
                square.setAttribute('data-type', 'test');
            }
            
            // Add icon if present
            if (transactionType.icon) {
                const icon = document.createElement('div');
                icon.className = 'transaction-type-icon';
                icon.textContent = transactionType.icon;
                icon.style.cssText = `
                    position: absolute;
                    top: 1px;
                    right: 1px;
                    font-size: ${Math.min(size * 0.4, 12)}px;
                    z-index: 25;
                    pointer-events: none;
                    text-shadow: 0 0 3px rgba(0,0,0,0.8);
                    line-height: 1;
                `;
                square.appendChild(icon);
            }
        }
        
        // Click handler
        square.addEventListener('click', () => {
            window.open(`https://sigmaspace.io/en/transaction/${transaction.id}`, '_blank');
        });
        
        // Tooltip handlers
        square.addEventListener('mouseenter', (e) => {
            handleMouseEnter(e, transaction);
            square.style.transform = 'scale(1.2)';
            square.style.zIndex = '30';
        });
        
        square.addEventListener('mouseleave', () => {
            handleMouseLeave();
            square.style.transform = 'scale(1)';
            square.style.zIndex = '20';
        });
        
        // Mouse move handler for tooltip positioning
        square.addEventListener('mousemove', (e) => {
            if (showTooltip && tooltipTransaction === transaction) {
                tooltipX = e.pageX + 10;
                tooltipY = e.pageY - 10;
            }
        });
        
        return { element: square, size: size };
    }
    
    // Export function for parent
    export function startPackingAnimation() {
        if (packingInProgress || !packingContainer) {
            console.log('📦 Packing already in progress or no container');
            return;
        }
        
        console.log('🚀 Starting ERGO packing animation with', $transactions.length, 'transactions');
        packingInProgress = true;
        
        // Clear previous packing
        const packingArea = packingContainer.querySelector('.ergo-packing-area');
        if (packingArea) {
            packingArea.innerHTML = '';
        }
        
        initializePackingSystem();
        
        const sortedTransactions = [...$transactions].sort((a, b) => (b.size || 0) - (a.size || 0));
        
        let currentBlockUsage = 0;
        let packedCount = 0;
        let animationIndex = 0;
        
        const packNextTransaction = () => {
            if (animationIndex >= sortedTransactions.length || 
                currentBlockUsage >= ERGO_PACKING_CONFIG.maxBlockSizeBytes) {
                packingInProgress = false;
                console.log(`📦 Packing complete: ${packedCount} transactions packed`);
                return;
            }
            
            const tx = sortedTransactions[animationIndex];
            const txSizeBytes = tx.size || 0;
            
            if (currentBlockUsage + txSizeBytes <= ERGO_PACKING_CONFIG.maxBlockSizeBytes) {
                const square = createTransactionSquare(tx, txSizeBytes);
                const position = findBestPackingPosition(square.size);
                
                if (position && packingArea) {
                    square.element.style.left = position.x + 'px';
                    square.element.style.top = position.y + 'px';
                    square.element.style.transform = 'scale(0)';
                    square.element.style.opacity = '0';
                    
                    packingArea.appendChild(square.element);
                    
                    // Animate appearance
                    setTimeout(() => {
                        square.element.style.transform = 'scale(1)';
                        square.element.style.opacity = '1';
                    }, 50);
                    
                    markSpaceAsOccupied(position, square.size);
                    
                    packedSquares.push({
                        element: square.element,
                        transaction: tx,
                        position: position,
                        size: square.size
                    });
                    
                    currentBlockUsage += txSizeBytes;
                    packedCount++;
                    
                    console.log(`📦 Packed transaction ${animationIndex + 1}: ${tx.id.substring(0, 8)}...`);
                }
            }
            
            animationIndex++;
            setTimeout(packNextTransaction, ERGO_PACKING_CONFIG.packingAnimationSpeed);
        };
        
        packNextTransaction();
    }
</script>

<div class="ergo-packing-container">
    <div class="ergo-packing-simplified-container">
        <div class="ergo-packing-hexagon-container-centered" bind:this={packingContainer}>
            <!-- SVG Hexagon -->
            <svg width={ERGO_PACKING_CONFIG.canvasWidth} height={ERGO_PACKING_CONFIG.canvasHeight}>
                <path 
                    d={createHexagonPath()} 
                    fill="none" 
                    stroke="var(--primary-orange)" 
                    stroke-width="3" 
                    opacity="0.9"
                    style="filter: drop-shadow(0 0 6px rgba(232, 115, 31, 0.4));"
                />
            </svg>
            
            <!-- Packing area for squares -->
            <div class="ergo-packing-area"></div>
        </div>
        
        <!-- Overflow warning -->
        {#if packingStats.mempoolSize > ERGO_PACKING_CONFIG.maxBlockSizeBytes}
            <div class="ergo-packing-overflow">
                <h4>📦 Mempool Overflow</h4>
                <p>
                    <strong>{formatBytes(packingStats.mempoolSize - ERGO_PACKING_CONFIG.maxBlockSizeBytes)}</strong> 
                    exceeds block capacity - transactions waiting for next block
                </p>
            </div>
        {/if}
    </div>
</div>

<!-- Enhanced Tooltip (same as MempoolGrid) -->
{#if showTooltip && tooltipTransaction}
    {@const isWallet = isWalletTx(tooltipTransaction)}
    {@const transactionType = identifyTransactionType(tooltipTransaction)}
    <div 
        class="transaction-tooltip" 
        style="left: {tooltipX}px; top: {tooltipY}px; display: block;"
    >
        {#if isWallet}
            <div style="color: #f39c12; font-weight: bold; margin-bottom: 4px;">🌟 Your Wallet Transaction</div>
        {/if}
        {#if transactionType.icon === '💖'}
            <div style="color: #e74c3c; font-weight: bold; margin-bottom: 4px;">💖 Donation Transaction</div>
        {:else if transactionType.icon === '🧪'}
            <div style="color: #f39c12; font-weight: bold; margin-bottom: 4px;">🧪 Test Transaction</div>
        {/if}
        <strong>Transaction</strong><br>
        ID: {shortenTransactionId(tooltipTransaction.id)}<br>
        Size: {tooltipTransaction.size || 'N/A'} bytes<br>
        Value: {(tooltipTransaction.value || 0).toFixed(4)} ERG<br>
        Value: ${(tooltipTransaction.usd_value || 0).toFixed(2)} USD
    </div>
{/if}

<style>
    .ergo-packing-container {
        width: 100%;
        max-width: 900px;
        min-height: 400px;
    }
    
    .ergo-packing-simplified-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 20px;
        background: linear-gradient(135deg, var(--darker-bg) 0%, var(--dark-bg) 100%);
        border-radius: 12px;
        border: 2px solid var(--border-color);
    }
    
    .ergo-packing-hexagon-container-centered {
        position: relative;
        width: 400px;
        height: 400px;
        margin: 20px auto; 
        filter: drop-shadow(0 4px 20px rgba(232, 115, 31, 0.2));
        display: flex;
        align-items: center;
        transition: all 0.3s ease;
        justify-content: center;
    }
    
    .ergo-packing-hexagon-container-centered:hover {
        filter: drop-shadow(0 6px 25px rgba(232, 115, 31, 0.3));
        transform: scale(1.02);
    }
    
    .ergo-packing-area {
        position: absolute;
        top: 0;
        left: 10%;
        width: 100%;
        height: 100%;
        z-index: 2;
        overflow: hidden;
    }
    
    .ergo-packing-overflow {
        text-align: center;
        padding: 20px;
        border: 2px dashed var(--primary-orange);
        border-radius: 10px;
        background: linear-gradient(135deg, rgba(232, 115, 31, 0.1) 0%, rgba(232, 115, 31, 0.05) 100%);
        margin-top: 20px;
        max-width: 600px;
    }
    
    /* Make sure SVG is centered within its container */
    .ergo-packing-hexagon-container-centered svg {
        position: absolute;
        top: 0%;          /* Center vertically */
        left: 10%;         /* Center horizontally */
        width: 100%;
        height: 100%;
        z-index: 15;
        pointer-events: none;
        overflow: visible;
    }
    
    .ergo-packing-overflow h4 {
        color: var(--primary-orange);
        margin: 0 0 10px 0;
        font-size: 16px;
    }
    
    .ergo-packing-overflow p {
        color: var(--secondary-orange);
        margin: 5px 0;
        font-size: 14px;
    }
    
    /* Tooltip styles */
    .transaction-tooltip {
        position: absolute;
        background: linear-gradient(135deg, var(--darker-bg) 0%, var(--dark-bg) 100%);
        border: 2px solid var(--primary-orange);
        padding: 12px;
        border-radius: 8px;
        font-size: 12px;
        color: var(--text-light);
        pointer-events: none;
        z-index: 1000;
        white-space: nowrap;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
    }
    
    /* Add animations for special transaction types */
    :global(.ergo-transaction-square[data-type="donation"]) {
        animation: donationGlow 3s infinite ease-in-out !important;
    }
    
    :global(.ergo-transaction-square[data-type="test"]) {
        animation: testGlow 2s infinite ease-in-out !important;
    }
    
    :global(.ergo-transaction-square .transaction-type-icon) {
        animation: iconPulse 2s infinite ease-in-out !important;
    }
    
    @keyframes donationGlow {
        0%, 100% { box-shadow: 0 0 8px #e74c3c40; }
        50% { box-shadow: 0 0 12px #e74c3c80; }
    }
    
    @keyframes testGlow {
        0%, 100% { box-shadow: 0 0 8px #f39c1240; }
        50% { box-shadow: 0 0 12px #f39c1280; }
    }
    
    @keyframes iconPulse {
        0%, 100% { transform: scale(1); opacity: 0.9; }
        50% { transform: scale(1.1); opacity: 1; }
    }
    
    /* Mobile adjustments - only change the left positioning */
    @media (max-width: 768px) {
        .ergo-packing-hexagon-container-centered svg {
            left: -10% !important;
        }
        
        .ergo-packing-area {
            left: -10% !important;
        }
    }
    
    @media (max-width: 640px) {
        .ergo-packing-hexagon-container-centered svg {
            left: -5% !important;
        }
        
        .ergo-packing-area {
            left: -5% !important;
        }
    }
    
    @media (max-width: 480px) {
        .ergo-packing-hexagon-container-centered svg {
            left: -10% !important;
        }
        
        .ergo-packing-area {
            left: -10% !important;
        }
    }
</style>