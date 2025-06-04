<script>
    import { transactions, colorMode, walletConnector, blockData } from '$lib/stores.js';
    import { valueColors } from '$lib/stores.js';
    import { isWalletTransaction } from '$lib/wallet.js';
    import { identifyTransactionType } from '$lib/transactionTypes.js';
    import { BlockFlowManager } from '$lib/BlockFlowManager.js';
    
    // BLOCKCHAIN CAPACITY CONFIGURATION
    const BLOCKCHAIN_CONFIG = {
        maxBlockSizeBytes: 2097152, // 2MB block capacity (ERGO protocol)
        targetFillPercentage: 95, // Allow up to 95% capacity for safety margin
        priorityMode: 'size', // 'size' = largest first, 'fee' = highest fee first (future)
        capacityBuffer: 0.05 // 5% buffer before showing "full" warnings
    };
    
    // Enhanced Physics Configuration - CALMER SETTINGS
    const ENHANCED_PHYSICS_CONFIG = {
    // MUCH CALMER PHYSICS - These values will make balls settle
    gravity: 0.08,        // Reduced from 0.18 - very gentle falling
    friction: 0.998,      // Increased from 0.992 - high damping
    bounce: 0.15,         // Reduced from 0.35 - very low bounce
    
    // SIMPLIFIED SEPARATION (remove pressure entirely)
    separationForce: 0.2, // Reduced from 0.8 - very gentle pushing
    minSeparationDistance: 2, // Reduced from 3 - allow closer packing
    
    // REMOVE ALL PRESSURE SYSTEM - these values are ignored now
    // (keeping them for compatibility but they won't be used)
    pressureRadius: 0,
    maxPressureForce: 0,
    pressureThreshold: 999,
    densityMultiplier: 0,
    capacityPressureStart: 1.0,
    maxCapacityPressure: 0,
    
    // Visual feedback - disabled for now
    enablePressureVisuals: false,
    pressureColorIntensity: 0,
    
    // Ball constraints
    minBallSize: 12,
    maxBallSize: 32,
    maxBalls: 150,        // Increased since we removed pressure system
    targetFPS: 60
};

    
    
    // Component state
    let physicsContainer;
    let balls = [];
    let physicsRunning = true;
    let interactionMode = 'bounce'; // 'bounce' or 'navigate'
    let animationId;
    let lastTime = 0;
    
    
    // PHASE 2: Block Flow Manager
    let blockFlowManager;
    let blockFlowActive = false;
    
    // BLOCKCHAIN CAPACITY STATE
    let currentBlockSize = 0;
    let isBlockFull = false;
    let capacityWarningShown = false;
    
    // Tooltip state
    let showTooltip = false;
    let tooltipX = 0;
    let tooltipY = 0;
    let tooltipTransaction = null;
    
    // Enhanced stats for display
    export let packingStats = {
        blockCapacity: BLOCKCHAIN_CONFIG.maxBlockSizeBytes,
        mempoolSize: 0,
        utilization: 0,
        totalTransactions: 0,
        packedTransactions: 0,
        efficiency: 0,
        status: 'Enhanced ball physics mode active',
        statusClass: 'info',
        // New physics stats
        globalPressure: 0,
        avgLocalPressure: 0,
        avgNeighbors: 0
    };
    
    
    // Enhanced Ball Class with physics integration
    class Ball {
        constructor(transaction, spawnFromTop = false) {
            this.settled = false;
            this.settleTimer = 0;
            this.lastPosition = { x: this.x, y: this.y };
            this.settleThreshold = 0.3;  // Movement threshold for settling
            this.settleFrames = 45;      // Frames of stillness required (about 0.75 seconds)
            this.transaction = transaction;
            this.size = this.calculateSize(transaction.size || 1000);
            this.color = this.calculateColor(transaction.value || 1);
            
            // Position ball
            if (spawnFromTop) {
                this.x = Math.random() * (physicsContainer.clientWidth - this.size);
                this.y = -this.size - 20; // Start above container
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = 0.5 + Math.random() * 1; // Gentle downward velocity
            } else {
                const position = this.findValidSpawnPosition();
                this.x = position.x;
                this.y = position.y;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
            }
            
            this.element = this.createElement();
            this.isWallet = isWalletTransaction(transaction, $walletConnector.connectedAddress);
            
            // Physics data (will be populated by physics engine)
            this.physicsData = {
                neighbors: 0,
                localPressure: 0,
                globalPressure: 0,
                totalPressure: 0
            };
            
        }
        
        calculateSize(sizeBytes) {
            const config = ENHANCED_PHYSICS_CONFIG;
            const normalized = Math.min(sizeBytes / 8000, 1); // Normalize to 8KB max
            return config.minBallSize + 
                   (config.maxBallSize - config.minBallSize) * Math.sqrt(normalized);
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
            const maxAttempts = 30;
            
            while (attempts < maxAttempts) {
                const x = radius + Math.random() * (physicsContainer.clientWidth - this.size);
                const y = radius + Math.random() * (physicsContainer.clientHeight - this.size);
                
                // Check collision with existing balls
                let overlaps = false;
                for (let ball of balls) {
                    const dx = (x + radius) - (ball.x + ball.size / 2);
                    const dy = (y + radius) - (ball.y + ball.size / 2);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const minDistance = radius + ball.size / 2 + ENHANCED_PHYSICS_CONFIG.minSeparationDistance;
                    
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
            
            // Fallback: spawn at top
            return {
                x: Math.random() * (physicsContainer.clientWidth - this.size),
                y: 0
            };
        }

        checkSettling() {
    const dx = Math.abs(this.x - this.lastPosition.x);
    const dy = Math.abs(this.y - this.lastPosition.y);
    const totalVelocity = Math.abs(this.vx) + Math.abs(this.vy);
    
    // Check if movement is below threshold
    if (dx < this.settleThreshold && dy < this.settleThreshold && totalVelocity < this.settleThreshold) {
        this.settleTimer++;
        
        // If still for enough frames, mark as settled
        if (this.settleTimer >= this.settleFrames) {
            this.settled = true;
            this.vx = 0;
            this.vy = 0;
            
            // Visual indication of settling (subtle)
            if (this.element) {
                this.element.style.filter = 'brightness(0.95) saturate(1.05)';
            }
            
            console.log(`Ball ${this.transaction.id.substring(0, 8)} has settled`);
        }
    } else {
        // Reset settle timer if ball moved
        this.settleTimer = 0;
        if (this.settled) {
            this.unsettled();
        }
    }
    
    // Update last position
    this.lastPosition.x = this.x;
    this.lastPosition.y = this.y;
}

        unsettle() {
    if (this.settled) {
        this.settled = false;
        this.settleTimer = 0;
        
        // Remove settled visual effect
        if (this.element) {
            this.element.style.filter = '';
        }
        
        console.log(`Ball ${this.transaction.id.substring(0, 8)} unsettled`);
    }
}
        resolveCollision(other) {
    const config = ENHANCED_PHYSICS_CONFIG;
    
    const radius1 = this.size / 2;
    const radius2 = other.size / 2;
    
    const dx = (this.x + radius1) - (other.x + radius2);
    const dy = (this.y + radius1) - (other.y + radius2);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = radius1 + radius2 + config.minSeparationDistance;
    
    if (distance < minDistance && distance > 0) {
        // Wake up both balls if they collide
        this.unsettle();
        other.unsettle();
        
        // ... rest of collision code stays the same ...
        const overlap = minDistance - distance;
        const separateX = (dx / distance) * overlap * 0.5;
        const separateY = (dy / distance) * overlap * 0.5;
        
        this.x += separateX;
        this.y += separateY;
        other.x -= separateX;
        other.y -= separateY;
        
        const normalX = dx / distance;
        const normalY = dy / distance;
        
        const relativeVelocityX = this.vx - other.vx;
        const relativeVelocityY = this.vy - other.vy;
        const speed = relativeVelocityX * normalX + relativeVelocityY * normalY;
        
        if (speed < 0) return;
        
        const impulse = speed * config.separationForce * 0.5;
        
        this.vx -= impulse * normalX;
        this.vy -= impulse * normalY;
        other.vx += impulse * normalX;
        other.vy += impulse * normalY;
    }
}


        
        createElement() {
            const element = document.createElement('div');
            element.className = `ball-physics enhanced-physics ${interactionMode}-mode`;
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
                transition: filter 0.3s ease, transform 0.3s ease;
                box-shadow: 
                    inset -2px -2px 4px rgba(0,0,0,0.3),
                    inset 2px 2px 4px rgba(255,255,255,0.1),
                    0 4px 8px rgba(0,0,0,0.3);
                z-index: 5;
            `;
            
            // Enhanced wallet highlighting
            if (this.isWallet) {
                element.style.border = '2px solid #f39c12';
                element.style.boxShadow = '0 0 12px rgba(243, 156, 18, 0.9), ' + element.style.boxShadow;
                element.style.zIndex = '15';
            }
            
            // Transaction type styling
            if (transactionType.color) {
                element.style.border = `2px solid ${transactionType.color}`;
                element.style.boxShadow = `0 0 10px ${transactionType.color}60, ` + element.style.boxShadow;
            }
            
            // Event listeners
            element.addEventListener('mouseenter', (e) => this.showTooltip(e));
            element.addEventListener('mouseleave', () => this.hideTooltip());
            element.addEventListener('click', (e) => this.handleClick(e));
            
            physicsContainer.appendChild(element);
            return element;
        }
        
        // Physics update is now handled by PhysicsEngine
        // This method is kept for legacy compatibility but does nothing
        update() {
            if (this.settled) return;
    if (!physicsRunning) return;
    
    const config = ENHANCED_PHYSICS_CONFIG;
    
    // Apply gravity (much gentler)
    this.vy += config.gravity;
    
    // Apply friction (more aggressive)
    this.vx *= config.friction;
    this.vy *= config.friction;
    
    // Cap maximum velocity to prevent crazy speeds
    const maxVel = 8;
    if (Math.abs(this.vx) > maxVel) this.vx = this.vx > 0 ? maxVel : -maxVel;
    if (Math.abs(this.vy) > maxVel) this.vy = this.vy > 0 ? maxVel : -maxVel;
    
    // Update position
    this.x += this.vx;
    this.y += this.vy;
    
    // Handle boundary collisions
    this.handleBoundaryCollisions();
    
    // Handle ball-to-ball collisions (optimized)
    this.handleBallCollisions();
    
    // Update DOM position
    this.updateDOMPosition();
}

    handleBoundaryCollisions() {
    const config = ENHANCED_PHYSICS_CONFIG;
    const containerWidth = physicsContainer.clientWidth;
    const containerHeight = physicsContainer.clientHeight;
    
    // Left wall
    if (this.x <= 0) {
        this.x = 0;
        this.vx = Math.abs(this.vx) * config.bounce;
    }
    
    // Right wall
    if (this.x >= containerWidth - this.size) {
        this.x = containerWidth - this.size;
        this.vx = -Math.abs(this.vx) * config.bounce;
    }
    
    // Top wall
    if (this.y <= 0) {
        this.y = 0;
        this.vy = Math.abs(this.vy) * config.bounce;
    }
    
    // Bottom wall (with extra friction)
    if (this.y >= containerHeight - this.size) {
        this.y = containerHeight - this.size;
        this.vy = -Math.abs(this.vy) * config.bounce;
        // Extra friction when hitting bottom
        this.vx *= 0.8;
    }
}

handleBallCollisions() {
    const config = ENHANCED_PHYSICS_CONFIG;
    
    // Only check nearby balls for performance
    const nearbyBalls = balls.filter(other => {
        if (other === this) return false;
        
        const dx = (this.x + this.size/2) - (other.x + other.size/2);
        const dy = (this.y + this.size/2) - (other.y + other.size/2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only check if within reasonable collision range
        return distance < (this.size/2 + other.size/2 + 30);
    });
    
    // Process collisions with nearby balls only
    nearbyBalls.forEach(other => {
        this.resolveCollision(other);
    });
}

resolveCollision(other) {
    const config = ENHANCED_PHYSICS_CONFIG;
    
    const radius1 = this.size / 2;
    const radius2 = other.size / 2;
    
    const dx = (this.x + radius1) - (other.x + radius2);
    const dy = (this.y + radius1) - (other.y + radius2);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = radius1 + radius2 + config.minSeparationDistance;
    
    if (distance < minDistance && distance > 0) {
        // Calculate overlap
        const overlap = minDistance - distance;
        const separateX = (dx / distance) * overlap * 0.5;
        const separateY = (dy / distance) * overlap * 0.5;
        
        // Gently separate balls
        this.x += separateX;
        this.y += separateY;
        other.x -= separateX;
        other.y -= separateY;
        
        // Very gentle velocity exchange
        const normalX = dx / distance;
        const normalY = dy / distance;
        
        const relativeVelocityX = this.vx - other.vx;
        const relativeVelocityY = this.vy - other.vy;
        const speed = relativeVelocityX * normalX + relativeVelocityY * normalY;
        
        if (speed < 0) return; // Objects separating
        
        // Gentle collision response (much less bouncy)
        const impulse = speed * config.separationForce * 0.5; // Reduced impulse
        
        this.vx -= impulse * normalX;
        this.vy -= impulse * normalY;
        other.vx += impulse * normalX;
        other.vy += impulse * normalY;
    }
}

updateDOMPosition() {
    if (this.element) {
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
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
                
                // Enhanced click force
                const clickForce = 10;
                this.vx += normalX * clickForce;
                this.vy += normalY * clickForce;
            } else {
                const angle = Math.random() * 2 * Math.PI;
                this.vx += Math.cos(angle) * 12;
                this.vy += Math.sin(angle) * 12;
            }
        }
        
        handleClick(e) {
        if (interactionMode === 'bounce') {
        const rect = physicsContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        this.applyClickBounce(clickX, clickY);
        
        // FIXED: Safer element manipulation
        if (this.element && this.element.classList) {
            // Remove class first if it exists
            this.element.classList.remove('ball-click-effect');
            
            // Force reflow to ensure the class removal takes effect
            void this.element.offsetHeight;
            
            // Add the class
            this.element.classList.add('ball-click-effect');
            
            // Use a more robust cleanup
            const cleanup = () => {
                if (this.element && this.element.classList && this.element.classList.contains('ball-click-effect')) {
                    this.element.classList.remove('ball-click-effect');
                }
            };
            
            setTimeout(cleanup, 150);
        }
        
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
            this.element.className = `ball-physics enhanced-physics ${interactionMode}-mode`;
            if (this.isWallet) this.element.classList.add('wallet-transaction');
            this.element.style.cursor = interactionMode === 'bounce' ? 'grab' : 'pointer';
        }
        
        destroy() {        
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }
    }
    
    // Enhanced Animation Loop with Physics Engine
    function animate(currentTime) {
    if (currentTime - lastTime >= 1000 / ENHANCED_PHYSICS_CONFIG.targetFPS) {
        if (physicsRunning) {
            // Only update non-settled balls for better performance
            const activeBalls = balls.filter(ball => !ball.settled);
            activeBalls.forEach(ball => ball.update());
            
            // Log performance info occasionally
            if (balls.length > 0 && Math.random() < 0.01) { // 1% chance per frame
                const settledCount = balls.length - activeBalls.length;
                console.log(`Performance: ${activeBalls.length} active, ${settledCount} settled of ${balls.length} total`);
            }
        }
        
        updateEnhancedStats();
        lastTime = currentTime;
    }
    
    if (physicsRunning) {
        animationId = requestAnimationFrame(animate);
    }
}
    
    // Update stats with enhanced physics data
    function updateEnhancedStats() {
        const capacityStatus = checkCapacityStatus();
        const physicsStats = {};
        
        packingStats = {
            blockCapacity: BLOCKCHAIN_CONFIG.maxBlockSizeBytes,
            mempoolSize: capacityStatus.currentSize,
            utilization: capacityStatus.utilizationPercent,
            totalTransactions: balls.length,
            packedTransactions: balls.length,
            efficiency: capacityStatus.utilizationPercent,
            status: `${balls.length} transactions • ${capacityStatus.utilizationPercent.toFixed(1)}% full • Pressure: ${physicsStats.globalPressure || 0}${blockFlowActive ? ' • Flow Active' : ''}`,
            statusClass: capacityStatus.isBlockFull ? 'error' : capacityStatus.utilizationPercent > 80 ? 'warning' : 'info',
            // Enhanced physics stats
            globalPressure: physicsStats.globalPressure || 0,
            avgLocalPressure: physicsStats.avgLocalPressure || 0,
            avgNeighbors: physicsStats.avgNeighbors || 0
        };
    }
    
    // CAPACITY MANAGEMENT (updated for physics engine)
    function calculateCurrentBlockSize() {
        return balls.reduce((total, ball) => total + (ball.transaction.size || 0), 0);
    }
    
    function canAddTransaction(transactionSize) {
        const currentSize = calculateCurrentBlockSize();
        const targetCapacity = BLOCKCHAIN_CONFIG.maxBlockSizeBytes * BLOCKCHAIN_CONFIG.targetFillPercentage / 100;
        return (currentSize + transactionSize) <= targetCapacity;
    }
    
    function checkCapacityStatus() {
        currentBlockSize = calculateCurrentBlockSize();
        const utilizationPercent = (currentBlockSize / BLOCKCHAIN_CONFIG.maxBlockSizeBytes) * 100;
        const targetPercent = BLOCKCHAIN_CONFIG.targetFillPercentage;
        
        const wasBlockFull = isBlockFull;
        isBlockFull = utilizationPercent >= targetPercent;
        
        if (utilizationPercent >= 80 && !capacityWarningShown) {
            showCapacityStatus(`Block ${utilizationPercent.toFixed(1)}% full - enhanced pressure physics active!`, 'warning');
            capacityWarningShown = true;
        }
        
        if (isBlockFull && !wasBlockFull) {
            showCapacityStatus('🚫 Block capacity reached! Enhanced physics creating stacking pressure.', 'error');
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
        max-width: 350px;
        font-size: 14px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        transition: transform 0.3s ease;
        ${type === 'warning' ? 'background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);' : ''}
        ${type === 'error' ? 'background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);' : ''}
        ${type === 'success' ? 'background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);' : ''}
        ${type === 'info' ? 'background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);' : ''}
    `;
    
    // FIXED: Add CSS class for initial hidden state instead of direct transform assignment
    statusDiv.classList.add('capacity-status-hidden');
    
    document.body.appendChild(statusDiv);
    
    // FIXED: Use CSS classes instead of direct transform assignment
    setTimeout(() => {
        statusDiv.classList.remove('capacity-status-hidden');
        statusDiv.classList.add('capacity-status-visible');
    }, 100);
    
    // FIXED: Use CSS classes for hide animation
    setTimeout(() => {
        statusDiv.classList.remove('capacity-status-visible');
        statusDiv.classList.add('capacity-status-hidden');
        setTimeout(() => statusDiv.remove(), 300);
    }, type === 'error' ? 6000 : 4000);
}
    
    // ENHANCED TRANSACTION ADDING (uses physics engine)
    function addTransactionBall(transaction) {
        const txSize = transaction.size || 1000;
        
        // Check capacity
        if (!canAddTransaction(txSize)) {
            console.log(`⚠️ Cannot add transaction (${formatBytes(txSize)}) - would exceed capacity`);
            removeOldestTransactions(txSize);
        }
        
        // Create ball with enhanced physics
        const ball = new Ball(transaction);
        balls.push(ball);
        
        // Update capacity status
        checkCapacityStatus();
        
        return ball;
    }
    
    function removeOldestTransactions(sizeNeeded) {
        console.log(`🚫 Block capacity reached! Removing transactions to make space for ${formatBytes(sizeNeeded)}`);
        
        const sortedBalls = [...balls].sort((a, b) => {
            if (a.transaction.isDummy && b.transaction.isDummy) {
                return a.transaction.size - b.transaction.size;
            }
            if (a.transaction.isDummy) return -1;
            if (b.transaction.isDummy) return 1;
            return (a.transaction.timestamp || 0) - (b.transaction.timestamp || 0);
        });
        
        let removedSize = 0;
        let removedCount = 0;
        
        while (removedSize < sizeNeeded && sortedBalls.length > 0) {
            const ballToRemove = sortedBalls.shift();
            const ballIndex = balls.indexOf(ballToRemove);
            
            if (ballIndex > -1) {
                removedSize += ballToRemove.transaction.size || 0;
                removedCount++;
                
                animateTransactionRemoval(ballToRemove);
                balls.splice(ballIndex, 1);
            }
        }
        
        console.log(`📤 Removed ${removedCount} transactions (${formatBytes(removedSize)})`);
        showCapacityStatus(`Removed ${removedCount} old transactions to make space`, 'info');
    }
    
    // FIXED: animateTransactionRemoval - This was causing the warning!
    function animateTransactionRemoval(ball) {
    if (ball.element && ball.element.classList) {
        ball.element.classList.add('ball-removal-animation');
    }
    
    setTimeout(() => {
        if (ball && typeof ball.destroy === 'function') {
            ball.destroy();
        }
    }, 800);
    }
    
    // ENHANCED CONTROL FUNCTIONS
    export function toggleInteractionMode() {
        interactionMode = interactionMode === 'bounce' ? 'navigate' : 'bounce';
        
        balls.forEach(ball => ball.updateInteractionMode());
        
        showCapacityStatus(`Interaction mode: ${interactionMode}`, 'info');
        return interactionMode;
    }
    
    export function togglePhysics() {
        physicsRunning = !physicsRunning;
        
        if (physicsRunning) {
            animate(performance.now());
            showCapacityStatus('Enhanced physics resumed', 'success');
        } else {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            showCapacityStatus('Enhanced physics paused', 'warning');
        }
        
        return physicsRunning;
    }
    
    export function addDummyTransactions() {
        const dummyCount = 12; // Reduced for better performance with enhanced physics
        let addedCount = 0;
        
        for (let i = 0; i < dummyCount; i++) {
            const dummyTx = {
                id: `dummy_${Date.now()}_${i}`,
                size: 500 + Math.random() * 4000,
                value: 0.1 + Math.random() * 3,
                usd_value: (0.1 + Math.random() * 3) * 1.5,
                isDummy: true,
                isWallet: Math.random() < 0.15,
                timestamp: Date.now() + i
            };
            
            addTransactionBall(dummyTx);
            addedCount++;
            
            const capacityStatus = checkCapacityStatus();
            if (capacityStatus.isBlockFull && i < dummyCount - 1) {
                console.log(`🚫 Block full after adding ${addedCount} dummies`);
                break;
            }
        }
        
        updateEnhancedStats();
        showCapacityStatus(`Added ${addedCount} dummy transactions with enhanced physics`, 'success');
        console.log(`➕ Added ${addedCount}/${dummyCount} dummy transactions`);
    }
    
    export function clearBalls() {
        balls.forEach(ball => ball.destroy());
        balls = [];
        
        isBlockFull = false;
        capacityWarningShown = false;
        currentBlockSize = 0;
        updateEnhancedStats();
        
        showCapacityStatus('All balls cleared', 'info');
    }
    
    // PHASE 2: Block Flow Controls (Enhanced)
    export function triggerTestBlockMining() {
        console.log('🧪 Enhanced test block mining...');
        if (blockFlowManager) {
            blockFlowManager.triggerTestBlockMining();
        } else {
            console.warn('⚠️ BlockFlowManager not initialized yet');
        }
    }
    
    export function triggerTestTransactionEntry() {
        console.log('🧪 Enhanced test transaction entry...');
        if (blockFlowManager) {
            blockFlowManager.triggerTestTransactionEntry();
        } else {
            console.warn('⚠️ BlockFlowManager not initialized yet');
        }
    }
    
    export function toggleBlockFlow() {
        console.log('🎬 Toggle enhanced block flow...');
        blockFlowActive = !blockFlowActive;
        
        if (blockFlowActive && !blockFlowManager) {
            initializeBlockFlow();
        }
        
        const message = `Enhanced block flow is now: ${blockFlowActive ? 'ACTIVE' : 'PAUSED'}`;
        showCapacityStatus(message, blockFlowActive ? 'success' : 'warning');
        console.log(`🎬 ${message}`);
        return blockFlowActive;
    }
    
    function initializeBlockFlow() {
        if (blockFlowManager) {
            blockFlowManager.destroy();
        }
        
        blockFlowManager = new BlockFlowManager(
            {
                balls: () => balls,
                Ball: Ball,
                physicsContainer: physicsContainer,
                canAddTransaction: canAddTransaction,
                get balls() { return balls; },
                set balls(newBalls) { balls = newBalls; }
            },
            {
                transactions,
                blockData
            }
        );
        
        console.log('🎬 Enhanced Block Flow Manager initialized');
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
    
    // Initialize with existing transactions (enhanced)
    $: if ($transactions.length > 0 && physicsContainer && !blockFlowManager) {
        initializeBallsFromTransactions();
    }
    
    // Initialize block flow when container is ready
    $: if (physicsContainer && !blockFlowManager) {
        setTimeout(() => {
            console.log('🎬 Auto-initializing enhanced block flow...');
            blockFlowActive = true;
            initializeBlockFlow();
        }, 500);
    }
    
    function initializeBallsFromTransactions() {
        clearBalls();
        
        const sortedTransactions = [...$transactions].sort((a, b) => (b.size || 0) - (a.size || 0));
        
        let addedCount = 0;
        for (const tx of sortedTransactions) {
            if (canAddTransaction(tx.size || 1000)) {
                addTransactionBall(tx);
                addedCount++;
            } else {
                break;
            }
        }
        
        const capacityPercent = checkCapacityStatus().utilizationPercent;
        console.log(`📦 Loaded ${addedCount}/${$transactions.length} transactions with enhanced physics (capacity: ${capacityPercent.toFixed(1)}%)`);
        
        updateEnhancedStats();
        
        if (!physicsRunning) {
            physicsRunning = true;
            animate(performance.now());
        }
    }
    
    // Component lifecycle
    import { onMount, onDestroy } from 'svelte';
    
    onMount(() => {
        if (physicsContainer) {
            animate(performance.now());
            console.log('⚡ Enhanced Ball Physics Grid mounted');
        }
    });
    
    onDestroy(() => {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        if (blockFlowManager) {
            blockFlowManager.destroy();
        }

        clearBalls();
        console.log('🧹 Enhanced Ball Physics Grid destroyed');
    });
</script>

<div class="ball-physics-container">
    <div 
        class="ball-physics-area enhanced-physics block-shape" 
        class:block-full={isBlockFull}
        class:block-flow-active={blockFlowActive}
        bind:this={physicsContainer}
        on:load={initializePhysicsEngine}
    >
        <div class="block-label">
            Enhanced Block Physics: 2.0 MB 
            {#if blockFlowActive}
                <span class="flow-indicator">🎬 LIVE</span>
            {/if}
            {#if isBlockFull}
                <span class="full-indicator">🚫 FULL</span>
            {:else if currentBlockSize / BLOCKCHAIN_CONFIG.maxBlockSizeBytes > 0.8}
                <span class="warning-indicator">⚠️ {((currentBlockSize / BLOCKCHAIN_CONFIG.maxBlockSizeBytes) * 100).toFixed(0)}%</span>
            {/if}
        </div>
        
        <!-- Enhanced Capacity Indicator -->
        <div class="capacity-indicator enhanced">
            <div class="capacity-mini-bar">
                <div 
                    class="capacity-mini-fill" 
                    class:capacity-warning={currentBlockSize / BLOCKCHAIN_CONFIG.maxBlockSizeBytes > 0.8}
                    class:capacity-full={isBlockFull}
                    style="width: {Math.min((currentBlockSize / BLOCKCHAIN_CONFIG.maxBlockSizeBytes) * 100, 100)}%"
                ></div>
            </div>
            <div class="capacity-text" 
                 class:capacity-warning={currentBlockSize / BLOCKCHAIN_CONFIG.maxBlockSizeBytes > 0.8}
                 class:capacity-full={isBlockFull}>
                {((currentBlockSize / BLOCKCHAIN_CONFIG.maxBlockSizeBytes) * 100).toFixed(0)}%
            </div>
        </div>
        
        <!-- Physics Debug Info (optional, can be toggled) -->
        {#if packingStats.globalPressure > 0}
            <div class="physics-debug">
                <span>🔧 Pressure: {packingStats.globalPressure}</span>
                <span>👥 Avg Neighbors: {packingStats.avgNeighbors}</span>
            </div>
        {/if}
    </div>
    
    <!-- Enhanced Stats Display -->
    <div class="ball-physics-info enhanced">
        <p><strong>Mode:</strong> {interactionMode === 'bounce' ? '🏀 Bounce' : '🔗 Navigate'}</p>
        <p><strong>Transactions:</strong> {balls.length}</p>
        <p><strong>Block Size:</strong> {formatBytes(currentBlockSize)} / {formatBytes(BLOCKCHAIN_CONFIG.maxBlockSizeBytes)}</p>
        <p><strong>Capacity:</strong> 
            <span class:capacity-warning={currentBlockSize / BLOCKCHAIN_CONFIG.maxBlockSizeBytes > 0.8} 
                  class:capacity-full={isBlockFull}>
                {((currentBlockSize / BLOCKCHAIN_CONFIG.maxBlockSizeBytes) * 100).toFixed(1)}%
            </span>
        </p>
        <p><strong>Global Pressure:</strong> 
            <span class="pressure-indicator" class:high-pressure={packingStats.globalPressure > 3}>
                {packingStats.globalPressure}
            </span>
        </p>
        <p><strong>Flow:</strong> 
            <span class:flow-active={blockFlowActive}>
                {blockFlowActive ? '🎬 Active' : '⏸️ Paused'}
            </span>
        </p>
    </div>
</div>

<!-- Enhanced Tooltip -->
{#if showTooltip && tooltipTransaction}
    {@const isWallet = $walletConnector.isConnected && $walletConnector.connectedAddress && isWalletTransaction(tooltipTransaction, $walletConnector.connectedAddress)}
    {@const transactionType = identifyTransactionType(tooltipTransaction)}
    <div 
        class="ball-tooltip enhanced" 
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
        
        <!-- Enhanced Physics Info in Tooltip -->
        {#if tooltipTransaction.physicsData}
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 11px; color: #bbb;">
                <strong>Physics:</strong><br>
                Neighbors: {tooltipTransaction.physicsData.neighbors}<br>
                Pressure: {tooltipTransaction.physicsData.totalPressure}
            </div>
        {/if}
    </div>
{/if}

<style>
    .ball-physics-container {
        width: 100%;
        max-width: 900px;
        min-height: 400px;
    }
    
    .ball-physics-area.enhanced-physics {
        position: relative;
        width: 800px;
        height: 600px;
        margin: 0 auto;
        border: 3px solid var(--primary-orange);
        border-radius: 10px;
        background: linear-gradient(135deg, var(--darker-bg) 0%, var(--dark-bg) 100%);
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(232, 115, 31, 0.4);
        transition: all 0.3s ease;
    }
    
    .ball-physics-area.enhanced-physics.block-flow-active {
        border-color: #27ae60;
        box-shadow: 0 8px 32px rgba(39, 174, 96, 0.3);
    }
    
    .ball-physics-area.enhanced-physics.block-full {
        border: 3px solid #e74c3c;
        box-shadow: 0 8px 32px rgba(231, 76, 60, 0.4);
        animation: enhancedBlockFullPulse 2s ease-in-out infinite alternate;
    }
    
    @keyframes enhancedBlockFullPulse {
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
        background: rgba(232, 115, 31, 0.9);
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
    
    .flow-indicator {
        background: #27ae60;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 700;
        animation: flowPulse 2s ease-in-out infinite alternate;
    }
    
    @keyframes flowPulse {
        from { opacity: 1; background: #27ae60; }
        to { opacity: 0.8; background: #2ecc71; }
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
    
    .capacity-indicator.enhanced {
        position: absolute;
        top: 15px;
        right: 15px;
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(0, 0, 0, 0.8);
        padding: 8px 12px;
        border-radius: 15px;
        z-index: 15;
        backdrop-filter: blur(15px);
        border: 1px solid rgba(232, 115, 31, 0.3);
        box-shadow: 0 4px 15px rgba(232, 115, 31, 0.2);
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
        font-size: 11px;
        font-weight: 600;
    }
    
    .capacity-indicator .capacity-text.capacity-warning {
        color: #f39c12;
    }
    
    .capacity-indicator .capacity-text.capacity-full {
        color: #e74c3c;
        animation: textPulse 1s ease-in-out infinite alternate;
    }
    /* Capacity status animation classes */
    :global(.capacity-status-hidden) {
    transform: translateX(100%) !important;
    }

    :global(.capacity-status-visible) {
    transform: translateX(0) !important;
    }

    /* Make sure the capacity-status base class has the transition */
    :global(.capacity-status) {
    transition: transform 0.3s ease !important;
    }

    
    @keyframes capacityWarning {
        from { opacity: 0.8; }
        to { opacity: 1; }
    }
    
    @keyframes capacityFull {
        from { opacity: 0.7; }
        to { opacity: 1; }
    }
    
    @keyframes textPulse {
        from { opacity: 1; }
        to { opacity: 0.7; }
    }
    
    .physics-debug {
        position: absolute;
        bottom: 15px;
        left: 15px;
        background: rgba(0, 0, 0, 0.8);
        color: #ccc;
        padding: 6px 10px;
        border-radius: 10px;
        font-size: 11px;
        font-family: monospace;
        z-index: 15;
        display: flex;
        gap: 12px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .ball-physics-info.enhanced {
        text-align: center;
        background: linear-gradient(135deg, rgba(232, 115, 31, 0.1) 0%, rgba(212, 101, 27, 0.05) 100%);
        padding: 20px;
        border-radius: 12px;
        margin-top: 20px;
        border: 2px solid rgba(232, 115, 31, 0.3);
        display: flex;
        justify-content: space-around;
        flex-wrap: wrap;
        gap: 15px;
        box-shadow: 0 4px 15px rgba(232, 115, 31, 0.1);
    }
    
    .ball-physics-info.enhanced p {
        margin: 5px 0;
        color: var(--text-light);
        font-size: 14px;
        font-weight: 500;
    }
    
    .capacity-warning {
        color: #f39c12 !important;
        font-weight: 600;
    }
    
    .capacity-full {
        color: #e74c3c !important;
        font-weight: 700;
        animation: textPulse 1s ease-in-out infinite alternate;
    }
    
    .pressure-indicator {
        color: #27ae60;
        font-weight: 600;
    }
    
    .pressure-indicator.high-pressure {
        color: #e74c3c;
        animation: pressurePulse 1s ease-in-out infinite alternate;
    }
    
    @keyframes pressurePulse {
        from { opacity: 1; }
        to { opacity: 0.7; }
    }
    
    .flow-active {
        color: #27ae60 !important;
        font-weight: 600;
    }
    
    .ball-tooltip.enhanced {
        position: absolute;
        background: linear-gradient(135deg, var(--darker-bg) 0%, var(--dark-bg) 100%);
        border: 2px solid var(--primary-orange);
        padding: 15px;
        border-radius: 10px;
        font-size: 13px;
        color: var(--text-light);
        pointer-events: none;
        z-index: 1000;
        white-space: nowrap;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(15px);
        border: 2px solid rgba(232, 115, 31, 0.8);
        max-width: 300px;
        white-space: normal;
    }
    
    /* FIXED: CSS classes for animations instead of direct style manipulation */
    :global(.ball-click-effect) {
    transform: scale(0.85) !important;
    filter: brightness(1.3) !important;
    transition: transform 0.15s ease, filter 0.15s ease !important;
    }
    
    :global(.ball-removal-animation) {
    transform: scale(0.1) !important;
    opacity: 0 !important;
    transition: all 0.8s ease-out !important;
    }
    /* Add these CSS classes to your BallPhysicsGrid.svelte <style> section */

    /* FIXED: CSS classes to replace all direct style assignments */
    :global(.ball-mining-fade) {
    opacity: var(--mining-opacity, 1);
    transform: scale(var(--mining-scale, 1));
    transition: opacity 0.05s ease, transform 0.05s ease;
    }

    :global(.ball-entry-start) {
    opacity: 0 !important;
    transform: scale(0.5) !important;
    filter: brightness(1.5) drop-shadow(0 0 10px rgba(39, 174, 96, 0.6)) !important;
    transition: none !important;
    }

    :global(.ball-entry-end) {
    opacity: 1 !important;
    transform: scale(1) !important;
    filter: brightness(1) drop-shadow(0 0 0 transparent) !important;
    transition: opacity 0.8s ease, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.8s ease !important;
    }

    :global(.ball-settling) {
    filter: brightness(0.9);
    transition: filter 0.5s ease;
    }

    /* Existing classes - make sure these are present */
    :global(.ball-click-effect) {
    transform: scale(0.85) !important;
    filter: brightness(1.3) !important;
    transition: transform 0.15s ease, filter 0.15s ease !important;
    }

    :global(.ball-removal-animation) {
    transform: scale(0.1) !important;
    opacity: 0 !important;
    transition: all 0.8s ease-out !important;
    }

    /* Enhanced ball physics styling */
    :global(.ball-physics.enhanced-physics) {
    transition: filter 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease !important;
    }

    /* Block flow animation classes */
    :global(.block-mining) {
    z-index: 100 !important;
    pointer-events: none;
    filter: brightness(1.2);
    }

    :global(.transaction-entry) {
    z-index: 50 !important;
    filter: drop-shadow(0 0 10px rgba(39, 174, 96, 0.6));
    }

    :global(.transaction-removal) {
    z-index: 75 !important;
    pointer-events: none;
    transform: scale(1.8) !important;
    opacity: 0 !important;
    filter: blur(4px) !important;
    transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
    }
    
    /* Enhanced ball physics styling */
    :global(.ball-physics.enhanced-physics) {
        transition: filter 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease !important;
    }
    
    :global(.ball-physics.enhanced-physics[data-type="donation"]) {
        animation: enhancedDonationGlow 3s infinite ease-in-out !important;
    }
    
    :global(.ball-physics.enhanced-physics[data-type="test"]) {
        animation: enhancedTestGlow 2s infinite ease-in-out !important;
    }
    
    @keyframes enhancedDonationGlow {
        0%, 100% { 
            box-shadow: 0 0 12px #e74c3c60, inset -2px -2px 4px rgba(0,0,0,0.3), inset 2px 2px 4px rgba(255,255,255,0.1);
        }
        50% { 
            box-shadow: 0 0 20px #e74c3c90, inset -2px -2px 4px rgba(0,0,0,0.3), inset 2px 2px 4px rgba(255,255,255,0.1);
        }
    }
    
    @keyframes enhancedTestGlow {
        0%, 100% { 
            box-shadow: 0 0 12px #f39c1260, inset -2px -2px 4px rgba(0,0,0,0.3), inset 2px 2px 4px rgba(255,255,255,0.1);
        }
        50% { 
            box-shadow: 0 0 20px #f39c1290, inset -2px -2px 4px rgba(0,0,0,0.3), inset 2px 2px 4px rgba(255,255,255,0.1);
        }
    }
    
    /* Block flow animation classes */
    :global(.block-mining) {
        z-index: 100 !important;
        pointer-events: none;
        filter: brightness(1.2);
    }
    
    :global(.transaction-entry) {
        z-index: 50 !important;
        filter: drop-shadow(0 0 10px rgba(39, 174, 96, 0.6));
    }
    
    :global(.transaction-removal) {
        z-index: 75 !important;
        pointer-events: none;
    }
    
    /* Responsive adjustments */
    @media (max-width: 900px) {
        .ball-physics-area.enhanced-physics {
            width: 100%;
            height: 500px;
        }
    }
    
    @media (max-width: 600px) {
        .ball-physics-area.enhanced-physics {
            height: 400px;
        }
        
        .ball-physics-info.enhanced {
            flex-direction: column;
            text-align: center;
            padding: 15px;
        }
        
        .physics-debug {
            flex-direction: column;
            gap: 4px;
        }
        
        .block-label {
            font-size: 12px;
            padding: 6px 12px;
        }
        
        .capacity-indicator.enhanced {
            padding: 6px 8px;
        }
    }
</style>