// BlockFlowManager.js - Complete version with destroy() method
// Phase 2: Transaction Flow Management (With Container Safety)

export class BlockFlowManager {
    constructor(ballPhysicsComponent, stores) {
        this.ballPhysics = ballPhysicsComponent;
        this.stores = stores;
        this.lastBlockHeight = 0;
        this.lastTransactionIds = new Set();
        this.isBlockMining = false;
        this.monitoringActive = true;
        this.subscriptions = []; // Track subscriptions for cleanup
        
        // Animation configuration
        this.config = {
            exitAnimationDuration: 2500,
            entryAnimationDuration: 1200,
            removalAnimationDuration: 800,
            settlingDuration: 1000,
            monitorInterval: 15000, // Check every 15 seconds
            batchDelay: 150 // Delay between batch additions
        };
        
        console.log('🎬 BlockFlowManager initialized');
        this.setupStoreSubscriptions();
    }
    
    // Check if the physics container is ready for operations
    isContainerReady() {
        return this.ballPhysics.physicsContainer && 
               this.ballPhysics.physicsContainer.clientWidth > 0 && 
               this.ballPhysics.physicsContainer.clientHeight > 0;
    }
    
    // 📡 STORE SUBSCRIPTIONS - Watch for data changes
    setupStoreSubscriptions() {
        // Subscribe to block data changes
        if (this.stores.blockData && this.stores.blockData.subscribe) {
            const blockSubscription = this.stores.blockData.subscribe(blocks => {
                if (!this.monitoringActive) return;
                
                if (blocks.length > 0) {
                    const latestHeight = blocks[0].height;
                    if (this.lastBlockHeight > 0 && latestHeight > this.lastBlockHeight) {
                        console.log(`🎉 New block detected: ${this.lastBlockHeight} → ${latestHeight}`);
                        this.handleNewBlock(latestHeight, []);
                    }
                    this.lastBlockHeight = latestHeight;
                }
            });
            this.subscriptions.push(blockSubscription);
        }
        
        // Subscribe to transaction changes
        if (this.stores.transactions && this.stores.transactions.subscribe) {
            const transactionSubscription = this.stores.transactions.subscribe(transactions => {
                if (!this.monitoringActive) return;
                this.handleTransactionChanges(transactions);
            });
            this.subscriptions.push(transactionSubscription);
        }
        
        console.log('📡 Store subscriptions active');
    }
    
    // 🚀 NEW BLOCK MINED - Epic animation sequence!
    async handleNewBlock(newBlockHeight, minedTransactionIds = []) {
        if (this.isBlockMining) {
            console.log('⚠️ Block mining animation already in progress');
            return;
        }
        
        if (!this.isContainerReady()) {
            console.warn('⚠️ Container not ready for block mining animation');
            return;
        }
        
        console.log(`🎉 NEW BLOCK ${newBlockHeight} MINED! Starting animation sequence...`);
        this.isBlockMining = true;
        
        try {
            // PHASE 1: Identify balls to remove (if we have specific IDs)
            let ballsToRemove = [];
            if (minedTransactionIds.length > 0) {
                ballsToRemove = this.ballPhysics.balls.filter(ball => 
                    minedTransactionIds.includes(ball.transaction.id)
                );
            } else {
                // If no specific IDs, remove random selection (simulate mining)
                const removalCount = Math.min(
                    Math.floor(this.ballPhysics.balls.length * 0.3), // 30% of balls
                    15 // Max 15 balls
                );
                ballsToRemove = this.ballPhysics.balls
                    .slice()
                    .sort(() => Math.random() - 0.5)
                    .slice(0, removalCount);
            }
            
            if (ballsToRemove.length === 0) {
                console.log('📭 No transactions to mine');
                this.isBlockMining = false;
                return;
            }
            
            // PHASE 2: Show block confirmation
            this.showBlockConfirmation(newBlockHeight, ballsToRemove.length);
            
            // PHASE 3: Animate balls flying away
            await this.animateBlockMining(ballsToRemove);
            
            // PHASE 4: Settle remaining balls
            await this.animateSettling();
            
            console.log(`✅ Block ${newBlockHeight} animation complete`);
            
        } catch (error) {
            console.error('❌ Block mining animation error:', error);
        } finally {
            this.isBlockMining = false;
        }
    }
    
    // 📥 HANDLE TRANSACTION CHANGES
    handleTransactionChanges(newTransactions) {
        if (!this.ballPhysics || !this.ballPhysics.balls || !this.isContainerReady()) {
            console.warn('⚠️ Ball physics not ready for transaction changes');
            return;
        }
        
        const currentIds = new Set(this.ballPhysics.balls.map(ball => ball.transaction.id));
        const newIds = new Set(newTransactions.map(tx => tx.id));
        
        // Find newly added transactions
        const addedTransactions = newTransactions.filter(tx => 
            !currentIds.has(tx.id) && 
            !tx.id.startsWith('dummy_') // Skip dummy transactions
        );
        
        // Find removed transactions
        const removedIds = Array.from(currentIds).filter(id => 
            !newIds.has(id) && 
            !id.startsWith('dummy_') // Skip dummy transactions
        );
        
        // Animate new transactions
        if (addedTransactions.length > 0) {
            console.log(`📥 ${addedTransactions.length} new transactions detected`);
            this.animateNewTransactions(addedTransactions);
        }
        
        // Animate removed transactions
        if (removedIds.length > 0) {
            console.log(`💨 ${removedIds.length} transactions removed`);
            this.animateTransactionRemovals(removedIds);
        }
        
        // Update last known state
        this.lastTransactionIds = newIds;
    }
    
    // 🎬 ANIMATION: Block mining - balls fly upward and away
    async animateBlockMining(ballsToRemove) {
        return new Promise(resolve => {
            if (!this.isContainerReady()) {
                console.warn('⚠️ Container not ready for block mining animation');
                resolve();
                return;
            }
            
            console.log(`🚀 Animating ${ballsToRemove.length} balls flying away...`);
            
            ballsToRemove.forEach((ball, index) => {
                // Add mining animation class
                ball.element.classList.add('block-mining');
                
                // Calculate exit trajectory (upward with spread)
                const centerX = this.ballPhysics.physicsContainer.clientWidth / 2;
                const ballCenterX = ball.x + ball.size / 2;
                const horizontalOffset = (ballCenterX - centerX) * 0.3; // Spread effect
                
                // Apply strong upward force with horizontal spread
                ball.vx = horizontalOffset + (Math.random() - 0.5) * 8;
                ball.vy = -15 - Math.random() * 10; // Strong upward velocity
                
                // Start fade-out animation
                let opacity = 1;
                let scale = 1;
                const fadeInterval = setInterval(() => {
                    opacity -= 0.04;
                    scale += 0.02; // Slight expansion as it fades
                    
                    if (ball.element) {
                        ball.element.style.opacity = opacity;
                        ball.element.style.transform = `scale(${scale})`;
                    }
                    
                    if (opacity <= 0) {
                        clearInterval(fadeInterval);
                        ball.destroy();
                        
                        // Remove from balls array
                        const ballIndex = this.ballPhysics.balls.indexOf(ball);
                        if (ballIndex > -1) {
                            this.ballPhysics.balls.splice(ballIndex, 1);
                        }
                    }
                }, 50);
            });
            
            // Resolve after animation duration
            setTimeout(() => {
                console.log('🎬 Block mining animation complete');
                resolve();
            }, this.config.exitAnimationDuration);
        });
    }
    
    // ✨ ANIMATION: New transactions drop from top
    async animateNewTransactions(newTransactions) {
        for (let i = 0; i < newTransactions.length; i++) {
            const tx = newTransactions[i];
            
            // Check capacity and container before adding
            if (this.isContainerReady() && 
                (!this.ballPhysics.canAddTransaction || 
                 this.ballPhysics.canAddTransaction(tx.size || 1000))) {
                
                await this.animateTransactionEntry(tx);
                
                // Small delay between each transaction
                if (i < newTransactions.length - 1) {
                    await new Promise(resolve => 
                        setTimeout(resolve, this.config.batchDelay)
                    );
                }
            } else {
                console.log(`⚠️ Skipping transaction ${tx.id} - container not ready or would exceed capacity`);
            }
        }
    }
    
    // 🎬 ANIMATION: Single transaction drops in - UPDATED with proper top spawn
    async animateTransactionEntry(transaction) {
        return new Promise(resolve => {
            // Check if container is available
            if (!this.isContainerReady()) {
                console.warn('⚠️ Physics container not ready for transaction entry');
                resolve();
                return;
            }
            
            try {
                // Create ball with top spawn (spawnFromTop = true)
                const ball = new this.ballPhysics.Ball(transaction, true);
                
                // The new Ball constructor will handle top positioning automatically
                // But we can add extra visual effects here
                
                // Add entry animation effects
                if (ball.element) {
                    ball.element.classList.add('transaction-entry');
                    ball.element.style.opacity = '0';
                    ball.element.style.transform = 'scale(0.5)';
                    ball.element.style.filter = 'brightness(1.5) drop-shadow(0 0 10px rgba(39, 174, 96, 0.6))';
                }
                
                // Add to physics system
                this.ballPhysics.balls.push(ball);
                
                // Animate entry with enhanced visual effects
                setTimeout(() => {
                    if (ball.element) {
                        ball.element.style.transition = 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.8s ease';
                        ball.element.style.opacity = '1';
                        ball.element.style.transform = 'scale(1)';
                        ball.element.style.filter = 'brightness(1) drop-shadow(0 0 0 transparent)';
                    }
                }, 50);
                
                // Apply gentle entry velocity (the Ball constructor already handles this)
                // But we can add a small random variation
                ball.vx += (Math.random() - 0.5) * 1;
                ball.vy += Math.random() * 1;
                
                setTimeout(() => {
                    if (ball.element) {
                        ball.element.classList.remove('transaction-entry');
                        ball.element.style.transition = '';
                    }
                    resolve();
                }, this.config.entryAnimationDuration);
                
            } catch (error) {
                console.error('❌ Failed to create transaction entry ball:', error);
                resolve();
            }
        });
    }
    
    // 💨 ANIMATION: Remove specific transactions
    async animateTransactionRemovals(removedTransactionIds) {
        const ballsToRemove = this.ballPhysics.balls.filter(ball => 
            removedTransactionIds.includes(ball.transaction.id)
        );
        
        ballsToRemove.forEach(ball => {
            if (ball.element) {
                ball.element.classList.add('transaction-removal');
                
                // "Puff" disappearance effect
                ball.element.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                ball.element.style.transform = 'scale(1.8)';
                ball.element.style.opacity = '0';
                ball.element.style.filter = 'blur(4px)';
            }
            
            setTimeout(() => {
                ball.destroy();
                
                // Remove from balls array
                const ballIndex = this.ballPhysics.balls.indexOf(ball);
                if (ballIndex > -1) {
                    this.ballPhysics.balls.splice(ballIndex, 1);
                }
            }, this.config.removalAnimationDuration);
        });
    }
    
    // 🎬 ANIMATION: Remaining balls settle down
    async animateSettling() {
        return new Promise(resolve => {
            console.log('💫 Applying settling forces to remaining balls...');
            
            // Apply gentle downward force to all remaining balls
            this.ballPhysics.balls.forEach(ball => {
                ball.vy += 2; // Gentle settling force
                ball.vx *= 0.7; // Reduce horizontal movement
                
                // Add subtle settling visual effect
                if (ball.element) {
                    ball.element.style.filter = 'brightness(0.9)';
                    setTimeout(() => {
                        if (ball.element) {
                            ball.element.style.filter = 'brightness(1)';
                        }
                    }, 500);
                }
            });
            
            setTimeout(() => {
                console.log('💫 Settling animation complete');
                resolve();
            }, this.config.settlingDuration);
        });
    }
    
    // 🎉 UI: Block confirmation notification
    showBlockConfirmation(blockHeight, transactionCount) {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'block-confirmation';
        statusDiv.innerHTML = `
            <div class="block-icon">⛏️</div>
            <div class="block-text">
                <strong>Block ${blockHeight} Mined!</strong><br>
                <span>${transactionCount} transactions confirmed</span>
            </div>
        `;
        
        statusDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-100%);
            padding: 16px 24px;
            border-radius: 12px;
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
            color: white;
            font-weight: 500;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 8px 32px rgba(39, 174, 96, 0.4);
            border: 2px solid #2ecc71;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        `;
        
        const icon = statusDiv.querySelector('.block-icon');
        if (icon) {
            icon.style.cssText = `
                font-size: 24px;
                animation: miningPulse 0.8s ease-in-out;
            `;
        }
        
        document.body.appendChild(statusDiv);
        
        // Slide down animation
        setTimeout(() => {
            statusDiv.style.transform = 'translateX(-50%) translateY(0)';
        }, 100);
        
        // Slide up and remove
        setTimeout(() => {
            statusDiv.style.transform = 'translateX(-50%) translateY(-100%)';
            setTimeout(() => {
                if (statusDiv.parentNode) {
                    statusDiv.remove();
                }
            }, 400);
        }, 4000);
        
        // Add CSS animation for icon
        if (!document.querySelector('#mining-keyframes')) {
            const style = document.createElement('style');
            style.id = 'mining-keyframes';
            style.textContent = `
                @keyframes miningPulse {
                    0% { transform: scale(1) rotate(0deg); }
                    50% { transform: scale(1.2) rotate(10deg); }
                    100% { transform: scale(1) rotate(0deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // 🎮 MANUAL TRIGGERS (for testing) - with container safety and top spawn
    triggerTestBlockMining() {
        if (!this.isContainerReady()) {
            console.warn('⚠️ Container not ready for test block mining');
            return;
        }
        
        const randomHeight = this.lastBlockHeight + 1;
        console.log('🧪 Triggering test block mining...');
        this.handleNewBlock(randomHeight, []);
    }
    
    triggerTestTransactionEntry() {
        if (!this.isContainerReady()) {
            console.warn('⚠️ Container not ready for test transaction entry');
            return;
        }
        
        const testTx = {
            id: `test_entry_${Date.now()}`,
            size: 1000 + Math.random() * 3000,
            value: Math.random() * 5,
            usd_value: Math.random() * 7.5,
            timestamp: Date.now()
        };
        
        console.log('🧪 Triggering test transaction entry...');
        this.animateTransactionEntry(testTx);
    }
    
    // 🧹 CLEANUP - This was the missing method!
    destroy() {
        console.log('🧹 Destroying BlockFlowManager...');
        
        // Stop monitoring
        this.monitoringActive = false;
        
        // Unsubscribe from all stores
        this.subscriptions.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                try {
                    unsubscribe();
                } catch (error) {
                    console.warn('⚠️ Error unsubscribing:', error);
                }
            }
        });
        this.subscriptions = [];
        
        // Clear any running animations or intervals
        this.isBlockMining = false;
        
        // Remove any lingering block confirmation notifications
        const confirmations = document.querySelectorAll('.block-confirmation');
        confirmations.forEach(el => {
            if (el.parentNode) {
                el.remove();
            }
        });
        
        // Remove CSS keyframes if they exist
        const keyframeStyle = document.querySelector('#mining-keyframes');
        if (keyframeStyle && keyframeStyle.parentNode) {
            keyframeStyle.remove();
        }
        
        // Clear references
        this.ballPhysics = null;
        this.stores = null;
        this.lastTransactionIds.clear();
        
        console.log('✅ BlockFlowManager destroyed successfully');
    }
}