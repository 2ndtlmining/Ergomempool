<script>
    import { transactions, colorMode, walletConnector } from '$lib/stores.js';
    import { valueColors } from '$lib/stores.js';
    import { isWalletTransaction } from '$lib/wallet.js';
    import { identifyTransactionType } from '$lib/transactionTypes.js';
    
    // BLOCKCHAIN CAPACITY CONFIGURATION
    const BLOCKCHAIN_CONFIG = {
        maxBlockSizeBytes: 2097152, // 2MB block capacity (ERGO protocol)
        targetFillPercentage: 95, // Allow up to 95% capacity for safety margin
        priorityMode: 'size', // 'size' = largest first, 'fee' = highest fee first (future)
        capacityBuffer: 0.05 // 5% buffer before showing "full" warnings
    };
    
    // Physics Configuration
    const PHYSICS_CONFIG = {
        gravity: 0.3,
        friction: 0.98,
        bounce: 0.7,
        minBallSize: 10,
        maxBallSize: 35,
        maxBalls: 150, // Increased limit but capacity-controlled
        targetFPS: 60,
        separationForce: 0.5,
        maxSpawnAttempts: 50,
        clickBounceForce: 8,
        bounceDecay: 0.95
    };
    
    // Component state
    let physicsContainer;
    let balls = [];
    let physicsRunning = true;
    let interactionMode = 'bounce'; // 'bounce' or 'navigate'
    let animationId;
    let lastTime = 0;
    let fpsCounter = 0;
    let lastFpsTime = 0;
    
    // BLOCKCHAIN CAPACITY STATE
    let currentBlockSize = 0;
    let isBlockFull = false;
    let capacityWarningShown = false;
    
    // Tooltip state
    let showTooltip = false;
    let tooltipX = 0;
    let tooltipY = 0;
    let tooltipTransaction = null;
    
    // Stats for display
    export let packingStats = {
        blockCapacity: BLOCKCHAIN_CONFIG.maxBlockSizeBytes,
        mempoolSize: 0,
        utilization: 0,
        totalTransactions: 0,
        packedTransactions: 0,
        efficiency: 0,
        status: 'Ball physics mode active',
        statusClass: 'info'
    };
    
    // CAPACITY MANAGEMENT FUNCTIONS
    function calculateCurrentBlockSize() {
        return balls.reduce((total, ball) => total + (ball.transaction.size || 0), 0);
    }
    
    function canAddTransaction(transactionSize) {
        const currentSize = calculateCurrentBlockSize();
        const targetCapacity = BLOCKCHAIN_CONFIG.maxBlockSizeBytes * BLOCKCHAIN_CONFIG.targetFillPercentage / 100;
        return (currentSize + transactionSize) <= targetCapacity;
    }
    
    function removeOldestTransactions(sizeNeeded) {
        console.log(`🚫 Block capacity reached! Removing transactions to make space for ${sizeNeeded} bytes`);
        
        // Sort balls by timestamp (oldest first) - for real transactions
        // For dummy transactions, remove smallest first
        const sortedBalls = [...balls].sort((a, b) => {
            if (a.transaction.isDummy && b.transaction.isDummy) {
                return a.transaction.size - b.transaction.size; // Smallest dummy first
            }
            if (a.transaction.isDummy) return -1; // Dummies first
            if (b.transaction.isDummy) return 1;
            return (a.transaction.timestamp || 0) - (b.transaction.timestamp || 0); // Oldest real tx first
        });
        
        let removedSize = 0;
        let removedCount = 0;
        
        while (removedSize < sizeNeeded && sortedBalls.length > 0) {
            const ballToRemove = sortedBalls.shift();
            const ballIndex = balls.indexOf(ballToRemove);
            
            if (ballIndex > -1) {
                removedSize += ballToRemove.transaction.size || 0;
                removedCount++;
                
                // Animate removal
                animateTransactionRemoval(ballToRemove);
                
                // Remove from balls array
                balls.splice(ballIndex, 1);
            }
        }
        
        console.log(`📤 Removed ${removedCount} transactions (${formatBytes(removedSize)})`);
        showCapacityStatus(`Removed ${removedCount} old transactions to make space`, 'info');
    }
    
    function animateTransactionRemoval(ball) {
        ball.element.style.transition = 'all 0.8s ease-out';
        ball.element.style.transform = 'scale(0.1)';
        ball.element.style.opacity = '0';
        
        setTimeout(() => {
            ball.destroy();
        }, 800);
    }
    
    function checkCapacityStatus() {
        currentBlockSize = calculateCurrentBlockSize();
        const utilizationPercent = (currentBlockSize / BLOCKCHAIN_CONFIG.maxBlockSizeBytes) * 100;
        const targetPercent = BLOCKCHAIN_CONFIG.targetFillPercentage;
        
        // Update block full status
        const wasBlockFull = isBlockFull;
        isBlockFull = utilizationPercent >= targetPercent;
        
        // Show capacity warnings
        if (utilizationPercent >= 80 && !capacityWarningShown) {
            showCapacityStatus(`Block ${utilizationPercent.toFixed(1)}% full - approaching capacity!`, 'warning');
            capacityWarningShown = true;
        }
        
        if (isBlockFull && !wasBlockFull) {
            showCapacityStatus('🚫 Block capacity reached! New transactions will replace old ones.', 'error');
        }
        
        if (!isBlockFull && wasBlockFull) {
            showCapacityStatus('✅ Block has space available again.', 'success');
            capacityWarningShown = false;
        }
        
        return {
            currentSize: currentBlockSize,
            utilizationPercent,
            isBlockFull,
            remainingSpace: BLOCKCHAIN_CONFIG.maxBlockSizeBytes - currentBlockSize
        };
    }
    
    function showCapacityStatus(message, type = 'info') {
        const existingStatus = document.querySelector('.capacity-status');
        if (existingStatus) existingStatus.remove();

        const statusDiv = document.createElement('div');
        statusDiv.className = `capacity-status ${type}`;
        statusDiv.textContent = message;
        statusDiv.style.cssText = `
            position: fixed;
            top: 120px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 350px;
            font-size: 14px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            ${type === 'warning' ? 'background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);' : ''}
            ${type === 'error' ? 'background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);' : ''}
            ${type === 'success' ? 'background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);' : ''}
            ${type === 'info' ? 'background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);' : ''}
        `;
        document.body.appendChild(statusDiv);
        
        setTimeout(() => statusDiv.style.transform = 'translateX(0)', 100);
        
        setTimeout(() => {
            statusDiv.style.transform = 'translateX(100%)';
            setTimeout(() => statusDiv.remove(), 300);
        }, type === 'error' ? 6000 : 4000);
    }
    
    // Ball Class (Enhanced with capacity awareness)
    class Ball {
        constructor(transaction) {
            this.transaction = transaction;
            this.size = this.calculateSize(transaction.size || 1000);
            this.color = this.calculateColor(transaction.value || 1);
            
            // Find a non-overlapping starting position
            const position = this.findValidSpawnPosition();
            this.x = position.x;
            this.y = position.y;
            
            // Random starting velocity
            this.vx = (Math.random() - 0.5) * 3;
            this.vy = (Math.random() - 0.5) * 3;
            
            this.element = this.createElement();
            this.isWallet = isWalletTransaction(transaction, $walletConnector.connectedAddress);
        }
        
        calculateSize(sizeBytes) {
            const normalized = Math.min(sizeBytes / 10000, 1); // Normalize to 10KB max
            return PHYSICS_CONFIG.minBallSize + 
                   (PHYSICS_CONFIG.maxBallSize - PHYSICS_CONFIG.minBallSize) * Math.sqrt(normalized);
        }
        
        calculateColor(value) {
            const maxValue = Math.max(...$transactions.map(tx => tx.value || 0), value);
            const normalized = Math.min(value / maxValue, 1);
            const index = Math.floor(normalized * (valueColors.length - 1));
            return valueColors[index];
        }
        
        findValidSpawnPosition() {
            const radius = this.size / 2;
            let attempts = 0;
            
            while (attempts < PHYSICS_CONFIG.maxSpawnAttempts) {
                // Spawn within block bounds
                const x = radius + Math.random() * (physicsContainer.clientWidth - this.size - radius);
                const y = radius + Math.random() * (physicsContainer.clientHeight - this.size - radius);
                
                // Check if position overlaps with existing balls
                let overlaps = false;
                for (let ball of balls) {
                    const dx = (x + radius) - (ball.x + ball.size / 2);
                    const dy = (y + radius) - (ball.y + ball.size / 2);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const minDistance = radius + ball.size / 2 + 5; // 5px buffer
                    
                    if (distance < minDistance) {
                        overlaps = true;
                        break;
                    }
                }
                
                if (!overlaps) {
                    return { x, y };
                }
                
                attempts++;
            }
            
            // Fallback: spawn at center
            return {
                x: physicsContainer.clientWidth / 2 - radius,
                y: physicsContainer.clientHeight / 2 - radius
            };
        }
        
        createElement() {
            const element = document.createElement('div');
            element.className = `ball-physics ${interactionMode}-mode`;
            if (this.isWallet) element.classList.add('wallet-transaction');
            
            // Add transaction type styling
            const transactionType = identifyTransactionType(this.transaction);
            if (transactionType.color) {
                if (transactionType.icon === '💖') {
                    element.setAttribute('data-type', 'donation');
                } else if (transactionType.icon === '🧪') {
                    element.setAttribute('data-type', 'test');
                }
            }
            
            element.style.cssText = `
                position: absolute;
                width: ${this.size}px;
                height: ${this.size}px;
                background-color: ${this.color};
                left: ${this.x}px;
                top: ${this.y}px;
                border-radius: 50%;
                cursor: ${interactionMode === 'bounce' ? 'grab' : 'pointer'};
                transition: all 0.2s ease;
                box-shadow: 
                    inset -2px -2px 4px rgba(0,0,0,0.3),
                    inset 2px 2px 4px rgba(255,255,255,0.1),
                    0 4px 8px rgba(0,0,0,0.3);
                z-index: 5;
            `;
            
            // Wallet highlighting
            if (this.isWallet) {
                element.style.border = '2px solid #f39c12';
                element.style.boxShadow = '0 0 8px rgba(243, 156, 18, 0.8), ' + element.style.boxShadow;
            }
            
            // Transaction type styling
            if (transactionType.color) {
                element.style.border = `2px solid ${transactionType.color}`;
                element.style.boxShadow = `0 0 8px ${transactionType.color}40, ` + element.style.boxShadow;
            }
            
            // Event listeners
            element.addEventListener('mouseenter', (e) => this.showTooltip(e));
            element.addEventListener('mouseleave', () => this.hideTooltip());
            element.addEventListener('click', (e) => this.handleClick(e));
            
            physicsContainer.appendChild(element);
            return element;
        }
        
        update() {
            if (!physicsRunning) return;
            
            // Apply gravity
            this.vy += PHYSICS_CONFIG.gravity;
            
            // Update position
            this.x += this.vx;
            this.y += this.vy;
            
            // Collision detection
            this.handleCollisions();
            
            // Apply friction
            this.vx *= PHYSICS_CONFIG.friction;
            this.vy *= PHYSICS_CONFIG.friction;
            
            // Update DOM position
            this.element.style.left = this.x + 'px';
            this.element.style.top = this.y + 'px';
        }
        
        handleCollisions() {
            const containerWidth = physicsContainer.clientWidth;
            const containerHeight = physicsContainer.clientHeight;
            
            // Boundary collisions
            if (this.x <= 0) {
                this.x = 0;
                this.vx = -this.vx * PHYSICS_CONFIG.bounce;
            }
            if (this.x >= containerWidth - this.size) {
                this.x = containerWidth - this.size;
                this.vx = -this.vx * PHYSICS_CONFIG.bounce;
            }
            if (this.y <= 0) {
                this.y = 0;
                this.vy = -this.vy * PHYSICS_CONFIG.bounce;
            }
            if (this.y >= containerHeight - this.size) {
                this.y = containerHeight - this.size;
                this.vy = -this.vy * PHYSICS_CONFIG.bounce;
            }
            
            // Ball-to-ball collision
            this.checkBallCollisions();
        }
        
        checkBallCollisions() {
            for (let other of balls) {
                if (other === this) continue;
                
                const dx = (this.x + this.size/2) - (other.x + other.size/2);
                const dy = (this.y + this.size/2) - (other.y + other.size/2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = (this.size + other.size) / 2 + 2; // 2px buffer
                
                if (distance < minDistance && distance > 0) {
                    // Calculate overlap and separation needed
                    const overlap = minDistance - distance;
                    const separateX = (dx / distance) * overlap * 0.51;
                    const separateY = (dy / distance) * overlap * 0.51;
                    
                    // Move balls apart
                    this.x += separateX;
                    this.y += separateY;
                    other.x -= separateX;
                    other.y -= separateY;
                    
                    // Elastic collision
                    const normalX = dx / distance;
                    const normalY = dy / distance;
                    const relativeVelocityX = this.vx - other.vx;
                    const relativeVelocityY = this.vy - other.vy;
                    const speed = relativeVelocityX * normalX + relativeVelocityY * normalY;
                    
                    if (speed < 0) return; // Objects separating
                    
                    const totalMass = this.size + other.size;
                    const impulse = 2 * speed / totalMass * PHYSICS_CONFIG.bounce;
                    
                    this.vx -= impulse * other.size * normalX;
                    this.vy -= impulse * other.size * normalY;
                    other.vx += impulse * this.size * normalX;
                    other.vy += impulse * this.size * normalY;
                    
                    // Add separation force
                    const separationForce = PHYSICS_CONFIG.separationForce;
                    this.vx += normalX * separationForce;
                    this.vy += normalY * separationForce;
                    other.vx -= normalX * separationForce;
                    other.vy -= normalY * separationForce;
                }
            }
        }
        
        applyClickBounce(clickX, clickY) {
            const ballCenterX = this.x + this.size / 2;
            const ballCenterY = this.y + this.size / 2;
            
            const dx = ballCenterX - clickX;
            const dy = ballCenterY - clickY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const normalX = dx / distance;
                const normalY = dy / distance;
                
                this.vx += normalX * PHYSICS_CONFIG.clickBounceForce;
                this.vy += normalY * PHYSICS_CONFIG.clickBounceForce;
            } else {
                const angle = Math.random() * 2 * Math.PI;
                this.vx += Math.cos(angle) * PHYSICS_CONFIG.clickBounceForce;
                this.vy += Math.sin(angle) * PHYSICS_CONFIG.clickBounceForce;
            }
        }
        
        handleClick(e) {
            if (interactionMode === 'bounce') {
                const rect = physicsContainer.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                
                this.applyClickBounce(clickX, clickY);
                
                // Visual feedback
                this.element.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    this.element.style.transform = 'scale(1)';
                }, 100);
                
            } else if (interactionMode === 'navigate') {
                if (this.transaction.id) {
                    window.open(`https://sigmaspace.io/en/transaction/${this.transaction.id}`, '_blank');
                }
            }
        }
        
        showTooltip(e) {
            tooltipTransaction = this.transaction;
            tooltipX = e.pageX + 10;
            tooltipY = e.pageY - 10;
            showTooltip = true;
        }
        
        hideTooltip() {
            showTooltip = false;
            tooltipTransaction = null;
        }
        
        updateInteractionMode() {
            this.element.className = `ball-physics ${interactionMode}-mode`;
            if (this.isWallet) this.element.classList.add('wallet-transaction');
            this.element.style.cursor = interactionMode === 'bounce' ? 'grab' : 'pointer';
        }
        
        destroy() {
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }
    }
    
    // Animation Loop
    function animate(currentTime) {
        if (currentTime - lastTime >= 1000 / PHYSICS_CONFIG.targetFPS) {
            balls.forEach(ball => ball.update());
            updateStats();
            
            // FPS calculation
            fpsCounter++;
            if (currentTime - lastFpsTime >= 1000) {
                fpsCounter = 0;
                lastFpsTime = currentTime;
            }
            
            lastTime = currentTime;
        }
        
        if (physicsRunning) {
            animationId = requestAnimationFrame(animate);
        }
    }
    
    // CAPACITY-AWARE TRANSACTION ADDING
    function addTransactionBall(transaction) {
        const txSize = transaction.size || 1000;
        
        // Check if we can add this transaction
        if (!canAddTransaction(txSize)) {
            console.log(`⚠️ Cannot add transaction (${formatBytes(txSize)}) - would exceed capacity`);
            
            // Remove old transactions to make space
            removeOldestTransactions(txSize);
        }
        
        // Now add the new transaction
        const ball = new Ball(transaction);
        balls.push(ball);
        
        // Update capacity status
        checkCapacityStatus();
        
        return ball;
    }
    
    // Control Functions (Enhanced with capacity awareness)
    export function toggleInteractionMode() {
        interactionMode = interactionMode === 'bounce' ? 'navigate' : 'bounce';
        
        // Update all existing balls
        balls.forEach(ball => ball.updateInteractionMode());
        
        return interactionMode;
    }
    
    export function togglePhysics() {
        physicsRunning = !physicsRunning;
        
        if (physicsRunning) {
            animate(performance.now());
        } else {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        }
        
        return physicsRunning;
    }
    
    export function addDummyTransactions() {
        const dummyCount = 15;
        let addedCount = 0;
        
        for (let i = 0; i < dummyCount; i++) {
            const dummyTx = {
                id: `dummy_${Date.now()}_${i}`,
                size: 200 + Math.random() * 6000,
                value: 0.001 + Math.random() * 8,
                usd_value: (0.001 + Math.random() * 8) * 1.5,
                isDummy: true,
                isWallet: Math.random() < 0.1,
                timestamp: Date.now() + i // For ordering
            };
            
            // Use capacity-aware adding
            addTransactionBall(dummyTx);
            addedCount++;
            
            // Check if block is full
            const capacityStatus = checkCapacityStatus();
            if (capacityStatus.isBlockFull && i < dummyCount - 1) {
                console.log(`🚫 Block full after adding ${addedCount} dummies`);
                break;
            }
        }
        
        updateStats();
        console.log(`➕ Added ${addedCount}/${dummyCount} dummy transactions`);
    }
    
    export function clearBalls() {
        balls.forEach(ball => ball.destroy());
        balls = [];
        isBlockFull = false;
        capacityWarningShown = false;
        currentBlockSize = 0;
        updateStats();
    }
    
    function updateStats() {
        const capacityStatus = checkCapacityStatus();
        
        packingStats = {
            blockCapacity: BLOCKCHAIN_CONFIG.maxBlockSizeBytes,
            mempoolSize: capacityStatus.currentSize,
            utilization: capacityStatus.utilizationPercent,
            totalTransactions: balls.length,
            packedTransactions: balls.length,
            efficiency: capacityStatus.utilizationPercent,
            status: `${balls.length} transactions (${capacityStatus.utilizationPercent.toFixed(1)}% full)`,
            statusClass: capacityStatus.isBlockFull ? 'error' : capacityStatus.utilizationPercent > 80 ? 'warning' : 'info'
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
    
    // Initialize with existing transactions (capacity-aware)
    $: if ($transactions.length > 0 && physicsContainer) {
        initializeBallsFromTransactions();
    }
    
    function initializeBallsFromTransactions() {
        // Clear existing balls
        clearBalls();
        
        // Sort transactions by size (largest first) to prioritize what fits in block
        const sortedTransactions = [...$transactions].sort((a, b) => (b.size || 0) - (a.size || 0));
        
        // Add transactions until capacity is reached
        let addedCount = 0;
        for (const tx of sortedTransactions) {
            if (canAddTransaction(tx.size || 1000)) {
                addTransactionBall(tx);
                addedCount++;
            } else {
                break; // Stop when capacity is reached
            }
        }
        
        console.log(`📦 Loaded ${addedCount}/${$transactions.length} transactions (capacity: ${checkCapacityStatus().utilizationPercent.toFixed(1)}%)`);
        
        updateStats();
        
        // Start animation if not running
        if (!physicsRunning) {
            physicsRunning = true;
            animate(performance.now());
        }
    }
    
    // Start animation when component mounts
    import { onMount, onDestroy } from 'svelte';
    
    onMount(() => {
        if (physicsContainer) {
            animate(performance.now());
        }
    });
    
    onDestroy(() => {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        clearBalls();
    });
</script>

<div class="ball-physics-container">
    <div 
        class="ball-physics-area block-shape" 
        class:block-full={isBlockFull}
        bind:this={physicsContainer}
    >
        <div class="block-label">
            Block Capacity: 2.0 MB 
            {#if isBlockFull}
                <span class="full-indicator">🚫 FULL</span>
            {:else if currentBlockSize / BLOCKCHAIN_CONFIG.maxBlockSizeBytes > 0.8}
                <span class="warning-indicator">⚠️ {((currentBlockSize / BLOCKCHAIN_CONFIG.maxBlockSizeBytes) * 100).toFixed(0)}%</span>
            {/if}
        </div>
        
        <!-- Compact Capacity Indicator (Top-Right Corner) -->
        <div class="capacity-indicator">
            <div class="capacity-mini-bar">
                <div 
                    class="capacity-mini-fill" 
                    class:capacity-warning={currentBlockSize / BLOCKCHAIN_CONFIG.maxBlockSizeBytes > 0.8}
                    class:capacity-full={isBlockFull}
                    style="width: {Math.min((currentBlockSize / BLOCKCHAIN_CONFIG.maxBlockSizeBytes) * 100, 100)}%"
                ></div>
            </div>
            <div class="capacity-text">{((currentBlockSize / BLOCKCHAIN_CONFIG.maxBlockSizeBytes) * 100).toFixed(0)}%</div>
        </div>
    </div>
    
    <!-- Enhanced Stats Display -->
    <div class="ball-physics-info">
        <p><strong>Mode:</strong> {interactionMode === 'bounce' ? '🏀 Bounce' : '🔗 Navigate'}</p>
        <p><strong>Transactions:</strong> {balls.length}</p>
        <p><strong>Block Size:</strong> {formatBytes(currentBlockSize)} / {formatBytes(BLOCKCHAIN_CONFIG.maxBlockSizeBytes)}</p>
        <p><strong>Capacity:</strong> <span class:capacity-warning={currentBlockSize / BLOCKCHAIN_CONFIG.maxBlockSizeBytes > 0.8} class:capacity-full={isBlockFull}>{((currentBlockSize / BLOCKCHAIN_CONFIG.maxBlockSizeBytes) * 100).toFixed(1)}%</span></p>
        <p><strong>Remaining:</strong> {formatBytes(BLOCKCHAIN_CONFIG.maxBlockSizeBytes - currentBlockSize)}</p>
    </div>
</div>

<!-- Enhanced Tooltip -->
{#if showTooltip && tooltipTransaction}
    {@const isWallet = $walletConnector.isConnected && $walletConnector.connectedAddress && isWalletTransaction(tooltipTransaction, $walletConnector.connectedAddress)}
    {@const transactionType = identifyTransactionType(tooltipTransaction)}
    <div 
        class="ball-tooltip" 
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
        Size: {formatBytes(tooltipTransaction.size || 0)}<br>
        Value: {(tooltipTransaction.value || 0).toFixed(4)} ERG<br>
        Value: ${(tooltipTransaction.usd_value || 0).toFixed(2)} USD
    </div>
{/if}

<style>
    .ball-physics-container {
        width: 100%;
        max-width: 900px;
        min-height: 400px;
    }
    
    .ball-physics-area {
        position: relative;
        width: 800px;
        height: 600px;
        margin: 0 auto;
        border: 3px solid var(--primary-blue);
        border-radius: 15px;
        background: linear-gradient(135deg, var(--darker-bg) 0%, var(--dark-bg) 100%);
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(44, 74, 107, 0.3);
        transition: all 0.3s ease;
    }
    
    .ball-physics-area.block-shape {
        border-radius: 10px;
        border: 3px solid var(--primary-orange);
    }
    
    /* Block capacity visual states */
    .ball-physics-area.block-full {
        border: 3px solid #e74c3c;
        box-shadow: 0 8px 32px rgba(231, 76, 60, 0.4);
        animation: blockFullPulse 2s ease-in-out infinite alternate;
    }
    
    @keyframes blockFullPulse {
        from { 
            border-color: #e74c3c;
            box-shadow: 0 8px 32px rgba(231, 76, 60, 0.4);
        }
        to { 
            border-color: #c0392b;
            box-shadow: 0 12px 40px rgba(231, 76, 60, 0.6);
        }
    }
    
    .block-label {
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(212, 101, 27, 0.9);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        z-index: 10;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .full-indicator {
        background: #e74c3c;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 700;
        animation: pulse 1s ease-in-out infinite alternate;
    }
    
    .warning-indicator {
        background: #f39c12;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 700;
    }
    
    @keyframes pulse {
        from { opacity: 1; }
        to { opacity: 0.7; }
    }
    
    /* Compact Capacity Indicator (Top-Right Corner) */
    .capacity-indicator {
        position: absolute;
        top: 15px;
        right: 15px;
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(0, 0, 0, 0.7);
        padding: 6px 10px;
        border-radius: 15px;
        z-index: 15;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 11px;
        font-weight: 600;
    }
    
    .capacity-mini-bar {
        width: 60px;
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        overflow: hidden;
    }
    
    .capacity-mini-fill {
        height: 100%;
        background: linear-gradient(90deg, #27ae60 0%, #f39c12 70%, #e74c3c 100%);
        transition: width 0.3s ease;
        border-radius: 2px;
    }
    
    .capacity-mini-fill.capacity-warning {
        background: linear-gradient(90deg, #f39c12 0%, #e67e22 100%);
        animation: capacityWarning 2s ease-in-out infinite alternate;
    }
    
    .capacity-mini-fill.capacity-full {
        background: linear-gradient(90deg, #e74c3c 0%, #c0392b 100%);
        animation: capacityFull 1s ease-in-out infinite alternate;
    }
    
    .capacity-text {
        color: #ecf0f1;
        min-width: 28px;
        text-align: right;
    }
    
    .capacity-indicator .capacity-text.capacity-warning {
        color: #f39c12;
    }
    
    .capacity-indicator .capacity-text.capacity-full {
        color: #e74c3c;
        animation: textPulse 1s ease-in-out infinite alternate;
    }
    
    @keyframes capacityWarning {
        from { opacity: 0.8; }
        to { opacity: 1; }
    }
    
    @keyframes capacityFull {
        from { opacity: 0.7; }
        to { opacity: 1; }
    }
    
    .ball-physics-info {
        text-align: center;
        background: rgba(255, 255, 255, 0.02);
        padding: 15px;
        border-radius: 8px;
        margin-top: 20px;
        border: 1px solid var(--border-color);
        display: flex;
        justify-content: space-around;
        flex-wrap: wrap;
        gap: 10px;
    }
    
    .ball-physics-info p {
        margin: 5px 0;
        color: var(--text-light);
        font-size: 14px;
    }
    
    /* Capacity status colors */
    .capacity-warning {
        color: #f39c12 !important;
        font-weight: 600;
    }
    
    .capacity-full {
        color: #e74c3c !important;
        font-weight: 700;
        animation: textPulse 1s ease-in-out infinite alternate;
    }
    
    @keyframes textPulse {
        from { opacity: 1; }
        to { opacity: 0.7; }
    }
    
    .ball-tooltip {
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
    
    /* Ball animations for special transaction types */
    :global(.ball-physics[data-type="donation"]) {
        animation: donationGlow 3s infinite ease-in-out !important;
    }
    
    :global(.ball-physics[data-type="test"]) {
        animation: testGlow 2s infinite ease-in-out !important;
    }
    
    @keyframes donationGlow {
        0%, 100% { box-shadow: 0 0 8px #e74c3c40; }
        50% { box-shadow: 0 0 12px #e74c3c80; }
    }
    
    @keyframes testGlow {
        0%, 100% { box-shadow: 0 0 8px #f39c1240; }
        50% { box-shadow: 0 0 12px #f39c1280; }
    }
    
    /* Responsive adjustments */
    @media (max-width: 900px) {
        .ball-physics-area {
            width: 100%;
            height: 500px;
        }
    }
    
    @media (max-width: 600px) {
        .ball-physics-area {
            height: 400px;
        }
        
        .ball-physics-info {
            flex-direction: column;
            text-align: center;
        }
    }
</style>