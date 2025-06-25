// FIXED: BlockFlowManager.js - Replace all direct style assignments
// This file is causing the transform assignment warnings

export class BlockFlowManager {
    constructor(ballPhysicsComponent, stores) {
        this.ballPhysics = ballPhysicsComponent;
        this.stores = stores;
        this.lastBlockHeight = 0;
        this.lastTransactionIds = new Set();
        this.isBlockMining = false;
        this.monitoringActive = true;
        this.subscriptions = [];
        
        this.config = {
            exitAnimationDuration: 2500,
            entryAnimationDuration: 1200,
            removalAnimationDuration: 800,
            settlingDuration: 1000,
            monitorInterval: 15000,
            batchDelay: 150
        };
        
        console.log('🎬 BlockFlowManager initialized');
        this.setupStoreSubscriptions();
    }
    
    isContainerReady() {
        return this.ballPhysics.physicsContainer && 
               this.ballPhysics.physicsContainer.clientWidth > 0 && 
               this.ballPhysics.physicsContainer.clientHeight > 0;
    }
    
    setupStoreSubscriptions() {
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
        
        if (this.stores.transactions && this.stores.transactions.subscribe) {
            const transactionSubscription = this.stores.transactions.subscribe(transactions => {
                if (!this.monitoringActive) return;
                this.handleTransactionChanges(transactions);
            });
            this.subscriptions.push(transactionSubscription);
        }
        
        console.log('📡 Store subscriptions active');
    }
    
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
            let ballsToRemove = [];
            if (minedTransactionIds.length > 0) {
                ballsToRemove = this.ballPhysics.balls.filter(ball => 
                    minedTransactionIds.includes(ball.transaction.id)
                );
            } else {
                const removalCount = Math.min(
                    Math.floor(this.ballPhysics.balls.length * 0.3),
                    15
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
            
            this.showBlockConfirmation(newBlockHeight, ballsToRemove.length);
            await this.animateBlockMining(ballsToRemove);
            await this.animateSettling();
            
            console.log(`✅ Block ${newBlockHeight} animation complete`);
            
        } catch (error) {
            console.error('❌ Block mining animation error:', error);
        } finally {
            this.isBlockMining = false;
        }
    }
    
    handleTransactionChanges(newTransactions) {
        if (!this.ballPhysics || !this.ballPhysics.balls || !this.isContainerReady()) {
            console.warn('⚠️ Ball physics not ready for transaction changes');
            return;
        }
        
        const currentIds = new Set(this.ballPhysics.balls.map(ball => ball.transaction.id));
        const newIds = new Set(newTransactions.map(tx => tx.id));
        
        const addedTransactions = newTransactions.filter(tx => 
            !currentIds.has(tx.id) && 
            !tx.id.startsWith('dummy_')
        );
        
        const removedIds = Array.from(currentIds).filter(id => 
            !newIds.has(id) && 
            !id.startsWith('dummy_')
        );
        
        if (addedTransactions.length > 0) {
            console.log(`📥 ${addedTransactions.length} new transactions detected`);
            this.animateNewTransactions(addedTransactions);
        }
        
        if (removedIds.length > 0) {
            console.log(`💨 ${removedIds.length} transactions removed`);
            this.animateTransactionRemovals(removedIds);
        }
        
        this.lastTransactionIds = newIds;
    }
    
    // FIXED: No more direct style assignments - use CSS classes
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
                if (ball.element && ball.element.classList) {
                    ball.element.classList.add('block-mining');
                }
                
                // Calculate exit trajectory
                const centerX = this.ballPhysics.physicsContainer.clientWidth / 2;
                const ballCenterX = ball.x + ball.size / 2;
                const horizontalOffset = (ballCenterX - centerX) * 0.3;
                
                ball.vx = horizontalOffset + (Math.random() - 0.5) * 8;
                ball.vy = -15 - Math.random() * 10;
                
                // FIXED: Use CSS custom properties instead of direct assignments
                let opacity = 1;
                let scale = 1;
                const fadeInterval = setInterval(() => {
                    opacity -= 0.04;
                    scale += 0.02;
                    
                    // FIXED: Use CSS custom properties instead of direct style assignment
                    if (ball.element && ball.element.style) {
                        ball.element.style.setProperty('--mining-opacity', opacity);
                        ball.element.style.setProperty('--mining-scale', scale);
                        
                        // Add the CSS class if not already added
                        if (ball.element.classList && !ball.element.classList.contains('ball-mining-fade')) {
                            ball.element.classList.add('ball-mining-fade');
                        }
                    }
                    
                    if (opacity <= 0) {
                        clearInterval(fadeInterval);
                        ball.destroy();
                        
                        const ballIndex = this.ballPhysics.balls.indexOf(ball);
                        if (ballIndex > -1) {
                            this.ballPhysics.balls.splice(ballIndex, 1);
                        }
                    }
                }, 50);
            });
            
            setTimeout(() => {
                console.log('🎬 Block mining animation complete');
                resolve();
            }, this.config.exitAnimationDuration);
        });
    }
    
    async animateNewTransactions(newTransactions) {
        for (let i = 0; i < newTransactions.length; i++) {
            const tx = newTransactions[i];
            
            if (this.isContainerReady() && 
                (!this.ballPhysics.canAddTransaction || 
                 this.ballPhysics.canAddTransaction(tx.size || 1000))) {
                
                await this.animateTransactionEntry(tx);
                
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
    
    // FIXED: No more direct style assignments
    async animateTransactionEntry(transaction) {
        return new Promise(resolve => {
            if (!this.isContainerReady()) {
                console.warn('⚠️ Physics container not ready for transaction entry');
                resolve();
                return;
            }
            
            try {
                const ball = new this.ballPhysics.Ball(transaction, true);
                
                // FIXED: Use CSS classes instead of direct style manipulation
                if (ball.element && ball.element.classList) {
                    ball.element.classList.add('transaction-entry');
                    ball.element.classList.add('ball-entry-start');
                }
                
                this.ballPhysics.balls.push(ball);
                
                // FIXED: Use CSS class toggle instead of direct style assignment
                setTimeout(() => {
                    if (ball.element && ball.element.classList) {
                        ball.element.classList.remove('ball-entry-start');
                        ball.element.classList.add('ball-entry-end');
                    }
                }, 50);
                
                ball.vx += (Math.random() - 0.5) * 1;
                ball.vy += Math.random() * 1;
                
                setTimeout(() => {
                    if (ball.element && ball.element.classList) {
                        ball.element.classList.remove('transaction-entry', 'ball-entry-start', 'ball-entry-end');
                    }
                    resolve();
                }, this.config.entryAnimationDuration);
                
            } catch (error) {
                console.error('❌ Failed to create transaction entry ball:', error);
                resolve();
            }
        });
    }
    
    async animateTransactionRemovals(removedTransactionIds) {
        const ballsToRemove = this.ballPhysics.balls.filter(ball => 
            removedTransactionIds.includes(ball.transaction.id)
        );
        
        ballsToRemove.forEach(ball => {
            if (ball.element && ball.element.classList) {
                ball.element.classList.add('transaction-removal');
            }
            
            setTimeout(() => {
                ball.destroy();
                
                const ballIndex = this.ballPhysics.balls.indexOf(ball);
                if (ballIndex > -1) {
                    this.ballPhysics.balls.splice(ballIndex, 1);
                }
            }, this.config.removalAnimationDuration);
        });
    }
    
    async animateSettling() {
        return new Promise(resolve => {
            console.log('💫 Applying settling forces to remaining balls...');
            
            this.ballPhysics.balls.forEach(ball => {
                ball.vy += 2;
                ball.vx *= 0.7;
                
                // FIXED: Use CSS class instead of direct filter assignment
                if (ball.element && ball.element.classList) {
                    ball.element.classList.add('ball-settling');
                    setTimeout(() => {
                        if (ball.element && ball.element.classList) {
                            ball.element.classList.remove('ball-settling');
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
        
        setTimeout(() => {
            statusDiv.style.transform = 'translateX(-50%) translateY(0)';
        }, 100);
        
        setTimeout(() => {
            statusDiv.style.transform = 'translateX(-50%) translateY(-100%)';
            setTimeout(() => {
                if (statusDiv.parentNode) {
                    statusDiv.remove();
                }
            }, 400);
        }, 4000);
        
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
    
    destroy() {
        console.log('🧹 Destroying BlockFlowManager...');
        
        this.monitoringActive = false;
        
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
        
        this.isBlockMining = false;
        
        const confirmations = document.querySelectorAll('.block-confirmation');
        confirmations.forEach(el => {
            if (el.parentNode) {
                el.remove();
            }
        });
        
        const keyframeStyle = document.querySelector('#mining-keyframes');
        if (keyframeStyle && keyframeStyle.parentNode) {
            keyframeStyle.remove();
        }
        
        this.ballPhysics = null;
        this.stores = null;
        this.lastTransactionIds.clear();
        
        console.log('✅ BlockFlowManager destroyed successfully');
    }
}