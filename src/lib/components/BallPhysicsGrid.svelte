<script>
    import { transactions, walletConnector, valueColors } from '$lib/stores.js';
    import { isWalletTransaction } from '$lib/wallet.js';
    import { identifyTransactionType } from '$lib/transactionTypes.js';
    import { getPlatformConfig } from '$lib/transactionOrigins.js';
    
    // BLOCKCHAIN CAPACITY CONFIGURATION
    const BLOCKCHAIN_CONFIG = {
        maxBlockSizeBytes: 2097152, // 2MB block capacity
        targetFillPercentage: 95
    };
    
    // Simplified Physics Configuration - CALMER SETTINGS
    const PHYSICS_CONFIG = {
        gravity: 0.08,
        friction: 0.998,
        bounce: 0.15,
        separationForce: 0.2,
        minSeparationDistance: 2,
        minBallSize: 12,
        maxBallSize: 32,
        maxBalls: 150,
        targetFPS: 60
    };
    
    // Component state
    let physicsContainer;
    let balls = [];
    let physicsRunning = true;
    let animationId;
    let lastTime = 0;
    
    // FIXED: Track processed transactions to prevent duplicates
    let processedTransactionIds = new Set();
    
    // Tooltip state
    let showTooltip = false;
    let tooltipX = 0;
    let tooltipY = 0;
    let tooltipTransaction = null;
    
    // ADDED: Coordinated mining function to remove balls when blocks are mined
    async function handleCoordinatedMining(blockInfo) {
        const { height, transactionsCount } = blockInfo;
        
        console.log(`⛏️ Ball Physics: Starting coordinated mining for block ${height}: ${transactionsCount} transactions`);
        
        if (balls.length === 0) {
            console.log(`📭 No balls available to mine for block ${height}`);
            return;
        }
        
        // Calculate how many balls to remove (similar to TransactionPackingGrid logic)
        let ballsToRemove = calculateBallsToRemove(transactionsCount, balls.length);
        
        if (ballsToRemove > 0) {
            await performBallMiningAnimation(ballsToRemove, height);
        }
    }
    
    // ADDED: Calculate how many balls to remove during mining
    function calculateBallsToRemove(blockTxCount, availableBalls) {
        console.log(`🧮 Calculating balls to remove: block=${blockTxCount}, available=${availableBalls}`);
        
        if (availableBalls === 0) return 0;
        
        // Remove a reasonable percentage of balls based on block size
        // If block has many transactions, remove more balls
        if (blockTxCount === 0) {
            return Math.min(1, availableBalls); // Coinbase only, remove 1 ball
        }
        
        if (blockTxCount <= availableBalls) {
            return Math.min(blockTxCount, Math.max(1, Math.floor(availableBalls * 0.3))); // Remove 30% or block count, whichever is smaller
        }
        
        // Block needs more than we have, remove a good chunk but not all
        return Math.max(1, Math.floor(availableBalls * 0.5)); // Remove 50% when block is large
    }
    
    // ADDED: Animate ball mining/removal
    async function performBallMiningAnimation(ballsToRemove, blockHeight) {
        console.log(`⛏️ Ball Physics: Mining ${ballsToRemove} balls for block ${blockHeight}`);
        
        // Sort balls by age (remove oldest first) or by position
        const sortedBalls = [...balls]
            .filter(ball => ball.element && !ball.settled) // Prefer moving balls
            .concat(balls.filter(ball => ball.element && ball.settled)) // Then settled balls
            .slice(0, ballsToRemove);
        
        if (sortedBalls.length === 0) {
            console.log('📭 No suitable balls to mine');
            return;
        }
        
        // Add visual indication that balls are being "mined"
        sortedBalls.forEach((ball, index) => {
            setTimeout(() => {
                if (ball.element) {
                    // Add mining glow effect
                    ball.element.style.border = '3px solid #27ae60';
                    ball.element.style.boxShadow = '0 0 20px rgba(39, 174, 96, 0.9)';
                    ball.element.style.filter = 'brightness(1.3)';
                    
                    // Make ball "disappear" after a short delay
                    setTimeout(() => {
                        if (ball.element) {
                            ball.element.style.transition = 'all 0.5s ease-out';
                            ball.element.style.transform = 'scale(0.1)';
                            ball.element.style.opacity = '0';
                            ball.element.style.filter = 'blur(2px)';
                        }
                        
                        // Remove from arrays after animation
                        setTimeout(() => {
                            const ballIndex = balls.indexOf(ball);
                            if (ballIndex > -1) {
                                balls.splice(ballIndex, 1);
                                processedTransactionIds.delete(ball.transaction.id);
                                ball.destroy();
                                console.log(`⛏️ Removed ball for transaction ${ball.transaction.id?.substring(0, 8)}...`);
                            }
                        }, 500);
                        
                    }, 300);
                }
            }, index * 100); // Stagger the mining animation
        });
        
        console.log(`✅ Ball mining animation started for ${sortedBalls.length} balls`);
    }
    
    // Export these functions for Controls.svelte to use
    // ADDED: Debug function to check sync status
    export function debugBallSync() {
        console.log('🔍 Ball Physics Debug Info:');
        console.log(`- Store transactions: ${$transactions.length}`);
        console.log(`- Balls: ${balls.length}`);
        console.log(`- Processed IDs: ${processedTransactionIds.size}`);
        console.log(`- Transaction IDs in store:`, $transactions.map(tx => tx.id.substring(0, 8)));
        console.log(`- Ball transaction IDs:`, balls.map(ball => ball.transaction.id.substring(0, 8)));
        
        // Check for orphaned balls
        const currentTransactionIds = new Set($transactions.map(tx => tx.id));
        const orphanedBalls = balls.filter(ball => !currentTransactionIds.has(ball.transaction.id));
        if (orphanedBalls.length > 0) {
            console.warn(`🚨 Found ${orphanedBalls.length} orphaned balls!`);
        }
        
        return {
            storeTransactions: $transactions.length,
            balls: balls.length,
            processedIds: processedTransactionIds.size,
            orphanedBalls: orphanedBalls.length
        };
    }
    
    // ADDED: Force sync function to fix mismatches
    export function forceSyncBalls() {
        console.log('🔄 Force syncing balls with transaction store...');
        
        // Clear all existing balls
        balls.forEach(ball => ball.destroy());
        balls = [];
        processedTransactionIds.clear();
        
        // Recreate balls from current transaction store
        $transactions.forEach(transaction => {
            if (balls.length < PHYSICS_CONFIG.maxBalls) {
                const ball = createBallFromTransaction(transaction);
                balls.push(ball);
                processedTransactionIds.add(transaction.id);
            }
        });
        
        console.log(`✅ Force sync complete: ${balls.length} balls created for ${$transactions.length} transactions`);
    }
    
    // ADDED: Manual mining function for testing
    export function triggerTestMining() {
        if (balls.length === 0) {
            console.log('📭 No balls to mine in test mining');
            return;
        }
        
        const ballsToMine = Math.min(5, Math.ceil(balls.length * 0.3));
        console.log(`🧪 Test mining: removing ${ballsToMine} balls`);
        
        performBallMiningAnimation(ballsToMine, 'TEST');
    }
    
    export function addDummyTransactions() {
        const dummyCount = 12;
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
            
            if (!canAddTransaction(1000) && i < dummyCount - 1) {
                console.log(`🚫 Block full after adding ${addedCount} dummies`);
                break;
            }
        }
        
        console.log(`➕ Added ${addedCount}/${dummyCount} dummy transactions`);
    }
    
    export function clearBalls() {
        balls.forEach(ball => ball.destroy());
        balls = [];
        processedTransactionIds.clear(); // FIXED: Clear the tracking set too
        console.log('🗑️ All balls cleared');
    }
    
    // Simplified Ball Class - BOUNCE MODE ONLY
    class Ball {
        constructor(transaction) {
            this.settled = false;
            this.settleTimer = 0;
            this.transaction = transaction;
            this.size = this.calculateSize(transaction.size || 1000);
            this.color = this.calculateColor(transaction.value || 1);
            
            // Position ball
            const position = this.findValidSpawnPosition();
            this.x = position.x;
            this.y = position.y;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            
            this.lastPosition = { x: this.x, y: this.y };
            this.settleThreshold = 0.3;
            this.settleFrames = 45;
            
            this.element = this.createElement();
            this.isWallet = isWalletTransaction(transaction, $walletConnector.connectedAddress);
        }
        
        calculateSize(sizeBytes) {
            const normalized = Math.min(sizeBytes / 8000, 1);
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
            const maxAttempts = 30;
            
            while (attempts < maxAttempts) {
                const x = radius + Math.random() * (physicsContainer.clientWidth - this.size);
                const y = radius + Math.random() * (physicsContainer.clientHeight - this.size);
                
                let overlaps = false;
                for (let ball of balls) {
                    const dx = (x + radius) - (ball.x + ball.size / 2);
                    const dy = (y + radius) - (ball.y + ball.size / 2);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const minDistance = radius + ball.size / 2 + PHYSICS_CONFIG.minSeparationDistance;
                    
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
            
            return {
                x: Math.random() * (physicsContainer.clientWidth - this.size),
                y: 0
            };
        }

        checkSettling() {
            const dx = Math.abs(this.x - this.lastPosition.x);
            const dy = Math.abs(this.y - this.lastPosition.y);
            const totalVelocity = Math.abs(this.vx) + Math.abs(this.vy);
            
            if (dx < this.settleThreshold && dy < this.settleThreshold && totalVelocity < this.settleThreshold) {
                this.settleTimer++;
                
                if (this.settleTimer >= this.settleFrames) {
                    this.settled = true;
                    this.vx = 0;
                    this.vy = 0;
                    
                    if (this.element) {
                        this.element.style.filter = 'brightness(0.95) saturate(1.05)';
                    }
                }
            } else {
                this.settleTimer = 0;
                if (this.settled) {
                    this.unsettle();
                }
            }
            
            this.lastPosition.x = this.x;
            this.lastPosition.y = this.y;
        }

        unsettle() {
            if (this.settled) {
                this.settled = false;
                this.settleTimer = 0;
                
                if (this.element) {
                    this.element.style.filter = '';
                }
            }
        }
        
        createElement() {
            const element = document.createElement('div');
            element.className = 'ball-physics simple-ball';
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
                cursor: grab;
                transition: filter 0.3s ease;
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
            
            // Event listeners - BOUNCE MODE ONLY
            element.addEventListener('mouseenter', (e) => this.showTooltip(e));
            element.addEventListener('mouseleave', () => this.hideTooltip());
            element.addEventListener('click', (e) => this.handleClick(e));
            
            physicsContainer.appendChild(element);
            return element;
        }
        
        update() {
            if (this.settled) return;
            if (!physicsRunning) return;
            
            // Apply gravity
            this.vy += PHYSICS_CONFIG.gravity;
            
            // Apply friction
            this.vx *= PHYSICS_CONFIG.friction;
            this.vy *= PHYSICS_CONFIG.friction;
            
            // Cap maximum velocity
            const maxVel = 8;
            if (Math.abs(this.vx) > maxVel) this.vx = this.vx > 0 ? maxVel : -maxVel;
            if (Math.abs(this.vy) > maxVel) this.vy = this.vy > 0 ? maxVel : -maxVel;
            
            // Update position
            this.x += this.vx;
            this.y += this.vy;
            
            // Handle collisions
            this.handleBoundaryCollisions();
            this.handleBallCollisions();
            this.checkSettling();
            this.updateDOMPosition();
        }

        handleBoundaryCollisions() {
            const containerWidth = physicsContainer.clientWidth;
            const containerHeight = physicsContainer.clientHeight;
            
            if (this.x <= 0) {
                this.x = 0;
                this.vx = Math.abs(this.vx) * PHYSICS_CONFIG.bounce;
                this.unsettle();
            }
            
            if (this.x >= containerWidth - this.size) {
                this.x = containerWidth - this.size;
                this.vx = -Math.abs(this.vx) * PHYSICS_CONFIG.bounce;
                this.unsettle();
            }
            
            if (this.y <= 0) {
                this.y = 0;
                this.vy = Math.abs(this.vy) * PHYSICS_CONFIG.bounce;
                this.unsettle();
            }
            
            if (this.y >= containerHeight - this.size) {
                this.y = containerHeight - this.size;
                this.vy = -Math.abs(this.vy) * PHYSICS_CONFIG.bounce;
                this.vx *= 0.8; // Extra friction on bottom
                this.unsettle();
            }
        }

        handleBallCollisions() {
            // Only check nearby balls for performance
            const nearbyBalls = balls.filter(other => {
                if (other === this) return false;
                
                const dx = (this.x + this.size/2) - (other.x + other.size/2);
                const dy = (this.y + this.size/2) - (other.y + other.size/2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                return distance < (this.size/2 + other.size/2 + 30);
            });
            
            nearbyBalls.forEach(other => {
                this.resolveCollision(other);
            });
        }

        resolveCollision(other) {
            const radius1 = this.size / 2;
            const radius2 = other.size / 2;
            
            const dx = (this.x + radius1) - (other.x + radius2);
            const dy = (this.y + radius1) - (other.y + radius2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = radius1 + radius2 + PHYSICS_CONFIG.minSeparationDistance;
            
            if (distance < minDistance && distance > 0) {
                this.unsettle();
                other.unsettle();
                
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
                
                const impulse = speed * PHYSICS_CONFIG.separationForce * 0.5;
                
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
        
        handleClick(e) {
            // FIXED: Hide tooltip on click to prevent massive tooltip issue
            this.hideTooltip();
            
            const rect = physicsContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            
            this.applyClickBounce(clickX, clickY);
            
            // FIXED: Removed all visual feedback that caused zoom/shake
            // No more classList manipulation or transform effects
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
                
                const clickForce = 10;
                this.vx += normalX * clickForce;
                this.vy += normalY * clickForce;
                
                this.unsettle();
            } else {
                const angle = Math.random() * 2 * Math.PI;
                this.vx += Math.cos(angle) * 12;
                this.vy += Math.sin(angle) * 12;
                this.unsettle();
            }
        }
        
        // ENHANCED: Updated showTooltip with platform logo support
        showTooltip(e) {
            tooltipTransaction = this.transaction;
            tooltipX = e.clientX + 10;
            tooltipY = e.clientY - 10;
            showTooltip = true;
            
            // Get platform configuration for this transaction
            const platformConfig = getPlatformConfig(this.transaction.origin || 'P2P');
            
            // Store platform info for the tooltip
            tooltipTransaction.platformConfig = platformConfig;
        }
        
        hideTooltip() {
            showTooltip = false;
            tooltipTransaction = null;
        }
        
        destroy() {        
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }
    }
    
    // Simplified Animation Loop
    function animate(currentTime) {
        if (currentTime - lastTime >= 1000 / PHYSICS_CONFIG.targetFPS) {
            if (physicsRunning) {
                const activeBalls = balls.filter(ball => !ball.settled);
                activeBalls.forEach(ball => ball.update());
            }
            
            lastTime = currentTime;
        }
        
        if (physicsRunning) {
            animationId = requestAnimationFrame(animate);
        }
    }
    
    // Simplified capacity management
    function calculateCurrentBlockSize() {
        return balls.reduce((total, ball) => total + (ball.transaction.size || 0), 0);
    }
    
    function canAddTransaction(transactionSize) {
        const currentSize = calculateCurrentBlockSize();
        const targetCapacity = BLOCKCHAIN_CONFIG.maxBlockSizeBytes * BLOCKCHAIN_CONFIG.targetFillPercentage / 100;
        return (currentSize + transactionSize) <= targetCapacity;
    }
    
    function addTransactionBall(transaction) {
        // FIXED: Check if transaction already exists
        if (processedTransactionIds.has(transaction.id)) {
            console.log(`⏭️ Transaction ${transaction.id?.substring(0, 8)}... already exists, skipping`);
            return null;
        }
        
        const txSize = transaction.size || 1000;
        
        if (!canAddTransaction(txSize)) {
            // Remove oldest transactions to make space
            const sortedBalls = [...balls].sort((a, b) => {
                if (a.transaction.isDummy && b.transaction.isDummy) {
                    return a.transaction.size - b.transaction.size;
                }
                if (a.transaction.isDummy) return -1;
                if (b.transaction.isDummy) return 1;
                return (a.transaction.timestamp || 0) - (b.transaction.timestamp || 0);
            });
            
            let removedSize = 0;
            while (removedSize < txSize && sortedBalls.length > 0) {
                const ballToRemove = sortedBalls.shift();
                const ballIndex = balls.indexOf(ballToRemove);
                
                if (ballIndex > -1) {
                    removedSize += ballToRemove.transaction.size || 0;
                    // FIXED: Remove from tracking set when removing ball
                    processedTransactionIds.delete(ballToRemove.transaction.id);
                    ballToRemove.destroy();
                    balls.splice(ballIndex, 1);
                }
            }
        }
        
        const ball = new Ball(transaction);
        balls.push(ball);
        // FIXED: Add to tracking set
        processedTransactionIds.add(transaction.id);
        console.log(`➕ Added new ball for transaction ${transaction.id?.substring(0, 8)}...`);
        return ball;
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
    
    // FIXED: Updated reactive statement to only add NEW transactions
    $: if ($transactions.length > 0 && physicsContainer) {
        addNewTransactionsOnly($transactions);
    }
    
    // FIXED: New function that only adds transactions not yet processed
    function addNewTransactionsOnly(transactions) {
        if (!Array.isArray(transactions)) return;
        
        console.log(`🔄 Checking for new transactions... (${transactions.length} total, ${processedTransactionIds.size} already processed)`);
        
        let addedCount = 0;
        const sortedTransactions = [...transactions].sort((a, b) => (b.size || 0) - (a.size || 0));
        
        for (const tx of sortedTransactions) {
            // Only add if we haven't processed this transaction yet
            if (!processedTransactionIds.has(tx.id)) {
                if (canAddTransaction(tx.size || 1000)) {
                    addTransactionBall(tx);
                    addedCount++;
                } else {
                    console.log(`🚫 Cannot add transaction ${tx.id?.substring(0, 8)}... - capacity reached`);
                    break;
                }
            }
        }
        
        if (addedCount > 0) {
            console.log(`📦 Added ${addedCount} new transactions (${processedTransactionIds.size} total processed)`);
            
            if (!physicsRunning) {
                physicsRunning = true;
                animate(performance.now());
            }
        } else {
            console.log(`✅ No new transactions to add`);
        }
    }
    
    // Component lifecycle
    import { onMount, onDestroy } from 'svelte';
    
    onMount(() => {
        if (physicsContainer) {
            animate(performance.now());
            console.log('⚡ Simple Ball Physics Grid mounted - balls will persist between updates');
        }
        
        // ADDED: Listen for coordinated block events to remove balls during mining
        const handleNewBlockEvent = (event) => {
            const blockInfo = event.detail;
            console.log(`🎭 BallPhysics received coordinated block event:`, blockInfo);
            
            // Remove balls when blocks are mined (similar to TransactionPackingGrid)
            setTimeout(() => {
                handleCoordinatedMining(blockInfo);
            }, 100); // Small delay to coordinate with other components
        };
        
        if (typeof window !== 'undefined') {
            window.addEventListener('ergomempool:newblock', handleNewBlockEvent);
            console.log('📡 Ball Physics listening for coordinated block events');
        }
    });
    
    onDestroy(() => {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        
        // ADDED: Clean up event listener
        if (typeof window !== 'undefined') {
            window.removeEventListener('ergomempool:newblock', () => {});
            console.log('🧹 Removed coordinated block event listener from Ball Physics');
        }
        
        balls.forEach(ball => ball.destroy());
        balls = [];
        processedTransactionIds.clear();
        console.log('🧹 Simple Ball Physics Grid destroyed');
    });
</script>

<div class="simple-ball-physics-container">
    <div 
        class="simple-ball-physics-area" 
        bind:this={physicsContainer}
    >
        <div class="simple-block-label">
            Interactive Ball Physics
            <span class="bounce-hint">Click balls to bounce them!</span>
        </div>
    </div>
</div>

<!-- ENHANCED: Tooltip with platform logo support -->
{#if showTooltip && tooltipTransaction}
    {@const isWallet = $walletConnector.isConnected && $walletConnector.connectedAddress && isWalletTransaction(tooltipTransaction, $walletConnector.connectedAddress)}
    {@const transactionType = identifyTransactionType(tooltipTransaction)}
    {@const platformConfig = tooltipTransaction.platformConfig || { name: 'P2P Transfer', logo: '/logos/p2p.png' }}
    <div 
        class="simple-ball-tooltip" 
        style="position: fixed; left: {tooltipX}px; top: {tooltipY}px; display: block;"
    >
        <!-- Platform header with logo -->
        <div class="platform-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.2);">
            <img 
                src={platformConfig.logo} 
                alt={platformConfig.name}
                style="width: 20px; height: 20px; border-radius: 3px; object-fit: contain; background: rgba(255,255,255,0.1); padding: 2px;"
            />
            <span style="color: #ffffff; font-weight: bold; font-size: 11px;">
                {platformConfig.name}
            </span>
        </div>
        
        {#if isWallet}
            <div style="color: #f39c12; font-weight: bold; margin-bottom: 4px;">🌟 Your Wallet Transaction</div>
        {/if}
        {#if transactionType.icon === '💖'}
            <div style="color: #e74c3c; font-weight: bold; margin-bottom: 4px;">💖 Donation Transaction</div>
        {:else if transactionType.icon === '🧪'}
            <div style="color: #f39c12; font-weight: bold; margin-bottom: 4px;">🧪 Test Transaction</div>
        {/if}
        <strong>Transaction Details</strong><br>
        ID: {shortenTransactionId(tooltipTransaction.id)}<br>
        Size: {formatBytes(tooltipTransaction.size || 0)}<br>
        Value: {(tooltipTransaction.value || 0).toFixed(4)} ERG<br>
        Value: ${(tooltipTransaction.usd_value || 0).toFixed(2)} USD
    </div>
{/if}

<style>
    .simple-ball-physics-container {
        width: 100%;
        max-width: 900px;
        min-height: 400px;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    
    .simple-ball-physics-area {
        position: relative;
        width: 800px;
        height: 600px;
        border: 3px solid var(--primary-orange);
        border-radius: 15px;
        background: linear-gradient(135deg, var(--darker-bg) 0%, var(--dark-bg) 100%);
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(232, 115, 31, 0.4);
        transition: box-shadow 0.3s ease;
    }
    
    /* FIXED: Removed transform scale from hover */
    .simple-ball-physics-area:hover {
        box-shadow: 0 12px 40px rgba(232, 115, 31, 0.5);
    }
    
    .simple-block-label {
        position: absolute;
        top: 15px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, var(--primary-orange) 0%, var(--secondary-orange) 100%);
        color: white;
        padding: 10px 20px;
        border-radius: 25px;
        font-size: 16px;
        font-weight: 600;
        z-index: 10;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        box-shadow: 0 4px 15px rgba(232, 115, 31, 0.3);
    }
    
    .bounce-hint {
        font-size: 12px;
        font-weight: 400;
        opacity: 0.9;
        color: rgba(255, 255, 255, 0.9);
    }
    
    /* ENHANCED: Updated tooltip styling with platform header support */
    .simple-ball-tooltip {
        background: linear-gradient(135deg, var(--darker-bg) 0%, var(--dark-bg) 100%);
        border: 2px solid var(--primary-orange);
        padding: 12px;
        border-radius: 8px;
        font-size: 12px;
        color: var(--text-light);
        pointer-events: none;
        z-index: 1000;
        white-space: normal;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        max-width: 280px;
        line-height: 1.4;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    /* FIXED: Removed all transform/scale effects from ball styling */
    :global(.ball-physics.simple-ball) {
        transition: filter 0.15s ease !important;
    }
    
    :global(.ball-physics.simple-ball:hover) {
        filter: brightness(1.2) !important;
        z-index: 100 !important;
    }
    
    /* FIXED: Removed transform scale from click effect */
    :global(.ball-click-effect) {
        filter: brightness(1.3) !important;
        transition: filter 0.15s ease !important;
    }
    
    /* Enhanced ball styling for special transaction types */
    :global(.ball-physics.simple-ball[data-type="donation"]) {
        animation: simpleDonationGlow 3s infinite ease-in-out !important;
    }
    
    :global(.ball-physics.simple-ball[data-type="test"]) {
        animation: simpleTestGlow 2s infinite ease-in-out !important;
    }
    
    @keyframes simpleDonationGlow {
        0%, 100% { 
            box-shadow: 0 0 8px #e74c3c60, inset -2px -2px 4px rgba(0,0,0,0.3), inset 2px 2px 4px rgba(255,255,255,0.1);
        }
        50% { 
            box-shadow: 0 0 15px #e74c3c90, inset -2px -2px 4px rgba(0,0,0,0.3), inset 2px 2px 4px rgba(255,255,255,0.1);
        }
    }
    
    @keyframes simpleTestGlow {
        0%, 100% { 
            box-shadow: 0 0 8px #f39c1260, inset -2px -2px 4px rgba(0,0,0,0.3), inset 2px 2px 4px rgba(255,255,255,0.1);
        }
        50% { 
            box-shadow: 0 0 15px #f39c1290, inset -2px -2px 4px rgba(0,0,0,0.3), inset 2px 2px 4px rgba(255,255,255,0.1);
        }
    }
    
    /* Responsive adjustments */
    @media (max-width: 900px) {
        .simple-ball-physics-area {
            width: 100%;
            height: 500px;
        }
    }
    
    @media (max-width: 600px) {
        .simple-ball-physics-area {
            height: 400px;
        }
        
        .simple-block-label {
            font-size: 14px;
            padding: 8px 16px;
        }
        
        .bounce-hint {
            font-size: 11px;
        }
        
        .simple-ball-tooltip {
            max-width: 250px;
            font-size: 11px;
        }
    }
    
    @media (max-width: 480px) {
        .simple-ball-physics-area {
            height: 350px;
        }
        
        .simple-block-label {
            font-size: 12px;
            padding: 6px 12px;
        }
        
        .simple-ball-tooltip {
            max-width: 220px;
            font-size: 10px;
            padding: 10px;
        }
    }
</style>