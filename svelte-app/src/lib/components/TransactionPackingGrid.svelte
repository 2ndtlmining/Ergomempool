<!-- Enhanced TransactionPackingGrid.svelte - preserving all functionality + new animations -->
<script>
    import { transactions, walletConnector, blockData } from '$lib/stores.js';
    import { onMount, onDestroy } from 'svelte';
    import { Transaction } from '$lib/Transaction.js';
    import { GravityPackingAlgorithm } from '$lib/PackingAlgorithm.js';
    import { BlockFlowManager } from '$lib/BlockFlowManager.js';
    
    // UNCHANGED - blockchain configuration
    const BLOCKCHAIN_CONFIG = {
        maxBlockSizeBytes: 2 * 1024 * 1024, // 2MB block capacity
        animationDelay: 80, // ms between transaction animations
        repackDelay: 500,   // NEW: debounce delay for repacking
        sweepSpeed: 120     // NEW: ms between sweep confirmations
    };
    
    // UNCHANGED - responsive container dimensions
    let containerDimensions = { width: 800, height: 600 };
    
    // UNCHANGED - component state
    let packingContainer;
    let transactionObjects = [];
    let packingAlgorithm;
    let isPackingActive = false;
    let blockFlowManager;
    let blockFlowActive = false;
    let lastBlockHeight = 0;
    
    // UNCHANGED - capacity tracking
    let currentCapacityBytes = 0;
    let isBlockFull = false;
    
    // NEW - animation state
    let repackTimeout = null;
    let isMining = false;
    let sweepLine = null;
    
    // UNCHANGED - export stats for parent component
    export let packingStats = {
        blockCapacity: BLOCKCHAIN_CONFIG.maxBlockSizeBytes,
        mempoolSize: 0,
        utilization: 0,
        totalTransactions: 0,
        packedTransactions: 0,
        efficiency: 100,
        status: 'Transaction packing mode active',
        statusClass: 'info'
    };
    
    // UNCHANGED - responsive container size calculation
    function updateContainerSize() {
        const screenWidth = window.innerWidth;
        
        if (screenWidth <= 480) {
            containerDimensions = { width: screenWidth - 20, height: 350 };
        } else if (screenWidth <= 768) {
            containerDimensions = { width: screenWidth - 40, height: 450 };
        } else {
            containerDimensions = { width: 800, height: 600 };
        }
        
        console.log(`📱 Container size updated: ${containerDimensions.width}x${containerDimensions.height}`);
        
        if (packingAlgorithm) {
            packingAlgorithm = new GravityPackingAlgorithm(
                containerDimensions.width,
                containerDimensions.height,
                BLOCKCHAIN_CONFIG.maxBlockSizeBytes
            );
            
            if (transactionObjects.length > 0) {
                setTimeout(() => {
                    scheduleRepack('container resize');
                }, 100);
            }
        }
    }
    
    // UNCHANGED - mount logic
    onMount(() => {
        updateContainerSize();
        window.addEventListener('resize', updateContainerSize);
        
        if (packingContainer) {
            packingAlgorithm = new GravityPackingAlgorithm(
                containerDimensions.width,
                containerDimensions.height,
                BLOCKCHAIN_CONFIG.maxBlockSizeBytes
            );
            
            // Create sweep line element
            createSweepLine();
            
            console.log('📦 Transaction Packing Grid initialized');
            
            if ($transactions.length > 0) {
                initializeFromExistingTransactions();
            }
        }
    });
    
    // UNCHANGED - cleanup
    onDestroy(() => {
        window.removeEventListener('resize', updateContainerSize);
        
        if (repackTimeout) {
            clearTimeout(repackTimeout);
        }
        
        console.log('🧹 Cleaning up Transaction Packing Grid');
        
        clearAllTransactionsInternal();
        
        if (blockFlowManager) {
            blockFlowManager.destroy();
        }
        
        const statusElements = document.querySelectorAll('.capacity-status');
        statusElements.forEach(el => el.remove());
    });
    
    // UNCHANGED - reactive watchers (but now with debounced repacking)
    $: if ($transactions.length >= 0 && packingAlgorithm) {
        handleTransactionChanges();
    }
    
    $: if ($blockData.length > 0 && packingAlgorithm && transactionObjects.length > 0) {
        handleNewBlock();
    }
    
    $: if ($walletConnector.connectedAddress && transactionObjects.length > 0) {
        updateWalletHighlighting();
    }
    
    // UNCHANGED - initialization
    function initializeFromExistingTransactions() {
        console.log(`📥 Loading ${$transactions.length} existing transactions`);
        
        clearAllTransactionsInternal();
        
        transactionObjects = $transactions.map(txData => 
            new Transaction(txData, $walletConnector.connectedAddress)
        );
        
        scheduleRepack('initial load');
    }
    
    // ENHANCED - transaction change handling with new/removal detection
    function handleTransactionChanges() {
        if (isPackingActive || isMining) {
            console.log('⏳ Packing/mining active, skipping transaction change handling');
            return;
        }
        
        const existingIds = new Set(transactionObjects.map(tx => tx.id));
        const currentIds = new Set($transactions.map(tx => tx.id));
        
        // Detect new transactions
        const newTransactions = $transactions.filter(txData => !existingIds.has(txData.id));
        
        // Detect removed transactions
        const removedTransactions = transactionObjects.filter(tx => !currentIds.has(tx.id));
        
        let needsRepack = false;
        
        // Handle new transactions with arrival animation
        if (newTransactions.length > 0) {
            console.log(`📥 Adding ${newTransactions.length} new transactions with arrival animation`);
            
            handleNewTransactionArrivals(newTransactions);
            needsRepack = true;
        }
        
        // Handle removed transactions (instant disappear)
        if (removedTransactions.length > 0) {
            console.log(`📤 Removing ${removedTransactions.length} transactions instantly`);
            
            handleTransactionRemovals(removedTransactions);
            needsRepack = true;
        }
        
        // Schedule repack if needed
        if (needsRepack) {
            scheduleRepack('transaction changes');
        }
    }
    
    // NEW - handle new transaction arrivals with animation
    async function handleNewTransactionArrivals(newTransactions) {
        for (const txData of newTransactions) {
            const txObj = new Transaction(txData, $walletConnector.connectedAddress);
            
            // Create element immediately but positioned off-screen
            const maxValue = Math.max(...$transactions.map(tx => tx.value || 0), 1);
            txObj.createElement(packingContainer, maxValue, containerDimensions.width);
            
            // Add to our array
            transactionObjects.push(txObj);
            
            // Start arrival animation (will resolve when complete)
            txObj.animateArrival(0, 0, containerDimensions.width, 0);
        }
        
        showCapacityStatus(`${newTransactions.length} new transaction${newTransactions.length > 1 ? 's' : ''} arrived`, 'info');
    }
    
    // NEW - handle transaction removals with instant disappear
    async function handleTransactionRemovals(removedTransactions) {
        // Animate removal first
        const removalPromises = removedTransactions.map(tx => tx.animateInstantRemoval());
        
        // Wait for all removals to complete
        await Promise.all(removalPromises);
        
        // Clean up
        removedTransactions.forEach(tx => {
            if (tx.element && tx.element.parentNode) {
                tx.element.parentNode.removeChild(tx.element);
            }
            tx.destroy();
        });
        
        // Remove from our array
        const currentIds = new Set($transactions.map(tx => tx.id));
        transactionObjects = transactionObjects.filter(tx => currentIds.has(tx.id));
        
        console.log(`📊 Remaining transactions: ${transactionObjects.length}`);
        showCapacityStatus(`${removedTransactions.length} transaction${removedTransactions.length > 1 ? 's' : ''} removed`, 'info');
    }
    
    // NEW - debounced repack scheduling
    function scheduleRepack(reason) {
        if (repackTimeout) {
            clearTimeout(repackTimeout);
        }
        
        console.log(`⏰ Scheduling repack in ${BLOCKCHAIN_CONFIG.repackDelay}ms (reason: ${reason})`);
        
        repackTimeout = setTimeout(() => {
            runPackingAlgorithm();
            repackTimeout = null;
        }, BLOCKCHAIN_CONFIG.repackDelay);
    }
    
    // UNCHANGED - new block handling (but now with sweep animation)
    async function handleNewBlock() {
        if ($blockData.length === 0) return;
        
        const latestBlock = $blockData[0];
        const currentBlockHeight = latestBlock.height;
        
        if (lastBlockHeight > 0 && currentBlockHeight > lastBlockHeight) {
            console.log(`🎉 Real block mined: ${lastBlockHeight} → ${currentBlockHeight}`);
            
            if (transactionObjects.length > 0) {
                await performBlockMiningSweep(Math.min(5, transactionObjects.length));
            }
            
            showCapacityStatus(`🎉 Block ${currentBlockHeight} mined!`, 'success');
            
            setTimeout(() => {
                if (transactionObjects.length > 0) {
                    scheduleRepack('block mined');
                }
            }, 500);
        }
        
        lastBlockHeight = currentBlockHeight;
    }
    
    // UNCHANGED - wallet highlighting
    function updateWalletHighlighting() {
        transactionObjects.forEach(tx => {
            tx.isWallet = tx.isWallet || (
                $walletConnector.connectedAddress && 
                (tx.inputs?.some(input => input.address === $walletConnector.connectedAddress) ||
                 tx.outputs?.some(output => output.address === $walletConnector.connectedAddress))
            );
            
            if (tx.element) {
                if (tx.isWallet) {
                    tx.element.classList.add('wallet-transaction');
                    tx.element.style.border = '3px solid #f39c12';
                    tx.element.style.boxShadow = '0 0 15px rgba(243, 156, 18, 0.8)';
                    tx.element.style.zIndex = '15';
                }
            }
        });
    }
    
    // NEW - create sweep line element
    function createSweepLine() {
        if (!packingContainer) return;
        
        sweepLine = document.createElement('div');
        sweepLine.className = 'mining-sweep-line';
        sweepLine.style.cssText = `
            position: absolute;
            width: 4px;
            height: 100%;
            background: linear-gradient(to bottom, transparent, #27ae60, transparent);
            left: -10px;
            top: 0;
            opacity: 0;
            box-shadow: 0 0 15px #27ae60, 0 0 30px #27ae60;
            z-index: 100;
            transition: left 0.1s linear;
        `;
        
        packingContainer.appendChild(sweepLine);
    }
    
    // NEW - block mining sweep animation
    async function performBlockMiningSweep(transactionsToMine) {
        if (isMining || !sweepLine) return;
        
        isMining = true;
        console.log(`⛏️ Starting mining sweep for ${transactionsToMine} transactions`);
        
        // Sort transactions by x position for left-to-right sweep
        const sortedTransactions = [...transactionObjects]
            .filter(tx => tx.element && tx.placed)
            .sort((a, b) => parseInt(a.element.style.left) - parseInt(b.element.style.left))
            .slice(0, transactionsToMine);
        
        if (sortedTransactions.length === 0) {
            isMining = false;
            return;
        }
        
        // Show sweep line
        sweepLine.style.opacity = '1';
        sweepLine.style.left = '-10px';
        
        // Animate sweep line across container
        const sweepDuration = sortedTransactions.length * BLOCKCHAIN_CONFIG.sweepSpeed;
        sweepLine.style.transition = `left ${sweepDuration}ms linear`;
        sweepLine.style.left = containerDimensions.width + 'px';
        
        // Confirm transactions as sweep passes them
        for (let i = 0; i < sortedTransactions.length; i++) {
            const tx = sortedTransactions[i];
            const delay = i * BLOCKCHAIN_CONFIG.sweepSpeed;
            
            setTimeout(async () => {
                await tx.animateMiningConfirmation();
            }, delay);
        }
        
        // Wait for sweep to complete, then animate departures
        setTimeout(async () => {
            const departurePromises = sortedTransactions.map((tx, index) => {
                return new Promise(resolve => {
                    setTimeout(async () => {
                        await tx.animateMiningDeparture();
                        
                        // Remove from DOM and arrays
                        if (tx.element && tx.element.parentNode) {
                            tx.element.parentNode.removeChild(tx.element);
                        }
                        tx.destroy();
                        
                        resolve();
                    }, index * 100);
                });
            });
            
            // Wait for all departures
            await Promise.all(departurePromises);
            
            // Update transaction arrays
            const minedIds = sortedTransactions.map(tx => tx.id);
            transactionObjects = transactionObjects.filter(tx => !minedIds.includes(tx.id));
            $transactions = $transactions.filter(storeTx => !minedIds.includes(storeTx.id));
            
            // Hide sweep line
            sweepLine.style.opacity = '0';
            sweepLine.style.transition = 'opacity 0.5s ease';
            
            // Animate settling of remaining transactions
            await animateSettlingEffect();
            
            isMining = false;
            
            console.log(`✅ Mining sweep complete: ${minedIds.length} transactions mined`);
        }, sweepDuration + 200);
    }
    
    // NEW - settling animation for remaining transactions
    async function animateSettlingEffect() {
        console.log('💫 Animating settling effect for remaining transactions');
        
        const settlingPromises = transactionObjects.map((tx, index) => {
            if (tx.element && tx.placed && !tx.moving) {
                return tx.animateSettling(index * 50);
            }
            return Promise.resolve();
        });
        
        await Promise.all(settlingPromises);
        console.log('💫 Settling effect complete');
    }
    
    // ENHANCED - packing algorithm with new animation system
    async function runPackingAlgorithm() {
        if (isPackingActive || !packingAlgorithm || !packingContainer || isMining) {
            console.log('⚠️ Cannot run packing: ', {
                isPackingActive,
                hasAlgorithm: !!packingAlgorithm,
                hasContainer: !!packingContainer,
                isMining
            });
            return;
        }
        
        isPackingActive = true;
        showPackingStatus(true);
        
        console.log(`🔄 Running packing algorithm for ${transactionObjects.length} transactions`);
        
        // Clear any orphaned elements
        if (packingContainer) {
            const existingElements = packingContainer.querySelectorAll('.transaction-square');
            existingElements.forEach(element => {
                const hasMatchingTransaction = transactionObjects.some(tx => tx.element === element);
                if (!hasMatchingTransaction) {
                    element.parentNode.removeChild(element);
                }
            });
        }
        
        // Calculate max value for consistent coloring
        const maxValue = Math.max(...transactionObjects.map(tx => tx.value || 0), 1);
        
        // Run the packing algorithm
        const positions = packingAlgorithm.packTransactions(transactionObjects);
        
        console.log(`📍 Packing algorithm returned ${positions.length} positions`);
        
        // Animate transactions to their new positions
        const animationPromises = [];
        
        for (const { transaction, x, y } of positions) {
            // Ensure element exists
            if (!transaction.element) {
                transaction.createElement(packingContainer, maxValue, containerDimensions.width);
            }
            
            // Animate to position (returns promise)
            const animationPromise = transaction.animateToPosition(x, y, 0);
            animationPromises.push(animationPromise);
        }
        
        // Wait for all animations to complete
        await Promise.all(animationPromises);
        
        // Update capacity tracking
        updateCapacityTracking();
        updatePackingStats();
        
        isPackingActive = false;
        showPackingStatus(false);
        
        console.log('✅ Packing animation sequence completed');
        
        // Validate packing
        if (packingAlgorithm.validatePacking()) {
            console.log('✅ Packing validation passed');
        } else {
            console.warn('⚠️ Packing validation failed');
        }
        
        // Final DOM state check
        const visibleElements = packingContainer?.querySelectorAll('.transaction-square') || [];
        console.log(`🔍 Final DOM state: ${visibleElements.length} visible transaction elements`);
    }
    
    // UNCHANGED - capacity tracking
    function updateCapacityTracking() {
        currentCapacityBytes = transactionObjects
            .filter(tx => tx.placed)
            .reduce((sum, tx) => sum + tx.sizeBytes, 0);
        
        const utilizationPercent = (currentCapacityBytes / BLOCKCHAIN_CONFIG.maxBlockSizeBytes) * 100;
        const wasBlockFull = isBlockFull;
        isBlockFull = utilizationPercent >= 95;
        
        if (utilizationPercent >= 80 && !wasBlockFull) {
            showCapacityStatus(`Block ${utilizationPercent.toFixed(1)}% full`, 'warning');
        }
        
        if (isBlockFull && !wasBlockFull) {
            showCapacityStatus('🚫 Block capacity reached!', 'error');
        }
        
        if (!isBlockFull && wasBlockFull) {
            showCapacityStatus('✅ Block has space available', 'success');
        }
    }
    
    // UNCHANGED - stats update
    function updatePackingStats() {
        const stats = packingAlgorithm.getPackingStats();
        
        packingStats = {
            blockCapacity: BLOCKCHAIN_CONFIG.maxBlockSizeBytes,
            mempoolSize: stats.totalBytes,
            utilization: stats.capacityUsed,
            totalTransactions: transactionObjects.length,
            packedTransactions: stats.totalTransactions,
            efficiency: stats.efficiency,
            status: `${stats.totalTransactions} transactions packed (${stats.capacityUsed.toFixed(1)}% full)`,
            statusClass: stats.capacityUsed > 90 ? 'error' : stats.capacityUsed > 70 ? 'warning' : 'info',
            avgSizeKB: stats.avgSizeKB,
            visualUtilization: stats.visualUtilization,
            remainingCapacity: stats.remainingCapacity
        };
        
        console.log('📊 Updated packing stats:', packingStats);
    }
    
    // UNCHANGED - status functions
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
            transform: translateX(100%);
            transition: transform 0.3s ease;
            ${type === 'warning' ? 'background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);' : ''}
            ${type === 'error' ? 'background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);' : ''}
            ${type === 'success' ? 'background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);' : ''}
            ${type === 'info' ? 'background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);' : ''}
        `;
        
        document.body.appendChild(statusDiv);
        
        setTimeout(() => {
            statusDiv.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            statusDiv.style.transform = 'translateX(100%)';
            setTimeout(() => statusDiv.remove(), 300);
        }, type === 'error' ? 6000 : 4000);
    }
    
    function showPackingStatus(show) {
        const algorithmStatus = packingContainer?.querySelector('.algorithm-status');
        if (algorithmStatus) {
            algorithmStatus.style.display = show ? 'block' : 'none';
        }
    }
    
    // UNCHANGED - internal clear function
    function clearAllTransactionsInternal() {
        console.log(`🧹 Clearing ${transactionObjects.length} transaction objects internally`);
        
        transactionObjects.forEach(tx => {
            if (tx.element && tx.element.parentNode) {
                tx.element.parentNode.removeChild(tx.element);
            }
            tx.destroy();
        });
        transactionObjects = [];
        currentCapacityBytes = 0;
        isBlockFull = false;
        
        if (packingContainer) {
            const orphanedElements = packingContainer.querySelectorAll('.transaction-square');
            orphanedElements.forEach(element => {
                element.parentNode.removeChild(element);
            });
        }
    }
    
    // ENHANCED - export functions with new animations
    export function addDummyTransactions() {
        console.log('🎭 Adding dummy transactions with arrival animations');
        
        const dummyCount = 8;
        const dummyTransactions = [];
        
        for (let i = 0; i < dummyCount; i++) {
            const dummyTx = {
                id: `dummy_${Date.now()}_${i}`,
                size: 800 + Math.random() * 12000,
                value: 0.1 + Math.random() * 4,
                usd_value: (0.1 + Math.random() * 4) * 1.5,
                inputs: [],
                outputs: [],
                isDummy: true
            };
            
            const dummyTxObj = new Transaction(dummyTx, $walletConnector.connectedAddress);
            if (currentCapacityBytes + dummyTxObj.sizeBytes <= BLOCKCHAIN_CONFIG.maxBlockSizeBytes) {
                dummyTransactions.push(dummyTx);
            }
        }
        
        $transactions = [...$transactions, ...dummyTransactions];
        
        showCapacityStatus(`Added ${dummyTransactions.length} dummy transactions`, 'success');
    }
    
    export function clearAllTransactions() {
        console.log('🗑️ Clearing all transactions');
        
        clearAllTransactionsInternal();
        $transactions = [];
        
        updatePackingStats();
        showCapacityStatus('All transactions cleared', 'info');
    }
    
    export function repackTransactions() {
        console.log('🔄 Manually repacking all transactions');
        scheduleRepack('manual repack');
    }
    
    export function getPackingStats() {
        return packingStats;
    }
    
    // ENHANCED - block flow integration with new animations
    export function toggleBlockFlow() {
        blockFlowActive = !blockFlowActive;
        
        if (blockFlowActive && !blockFlowManager) {
            blockFlowManager = new BlockFlowManager(
                {
                    transactions: () => transactionObjects,
                    container: packingContainer,
                    canAddTransaction: (sizeBytes) => currentCapacityBytes + sizeBytes <= BLOCKCHAIN_CONFIG.maxBlockSizeBytes
                },
                { transactions, blockData }
            );
            console.log('🎬 Block Flow Manager initialized');
        }
        
        return blockFlowActive;
    }
    
    export async function triggerTestBlockMining() {
        if (blockFlowManager) {
            blockFlowManager.triggerTestBlockMining();
        } else {
            console.log('🧪 Simulating realistic block mining with sweep animation...');
            
            if (transactionObjects.length === 0) {
                showCapacityStatus('No transactions to mine', 'info');
                return;
            }
            
            const mineCount = Math.min(Math.floor(transactionObjects.length * 0.4), 8);
            await performBlockMiningSweep(mineCount);
            
            console.log(`✅ Test block mined: ${mineCount} transactions confirmed`);
        }
    }
    
    export function triggerTestTransactionEntry() {
        if (blockFlowManager) {
            blockFlowManager.triggerTestTransactionEntry();
        } else {
            console.log('🧪 Simulating new transactions arriving from left');
            addDummyTransactions();
        }
    }
</script>

<!-- UNCHANGED - template with sweep line added -->
<div class="transaction-packing-container">
    <div 
        class="transaction-packing-area" 
        class:block-full={isBlockFull}
        class:block-flow-active={blockFlowActive}
        class:mining-active={isMining}
        style="width: {containerDimensions.width}px; height: {containerDimensions.height}px;"
        bind:this={packingContainer}
    >
        <!-- Block Label -->
        <div class="block-label">
            Transaction Packing: 2MB Block
            {#if blockFlowActive}
                <span class="flow-indicator">🎬 LIVE</span>
            {/if}
            {#if isMining}
                <span class="mining-indicator">⛏️ MINING</span>
            {:else if isBlockFull}
                <span class="full-indicator">🚫 FULL</span>
            {:else if (currentCapacityBytes / BLOCKCHAIN_CONFIG.maxBlockSizeBytes) > 0.8}
                <span class="warning-indicator">⚠️ {((currentCapacityBytes / BLOCKCHAIN_CONFIG.maxBlockSizeBytes) * 100).toFixed(0)}%</span>
            {/if}
        </div>
        
        <!-- Algorithm Status -->
        <div class="algorithm-status" style="display: none;">
            🧠 Packing Algorithm Running...
        </div>
        
        <!-- Capacity Indicator -->
        <div class="capacity-indicator">
            <div class="capacity-bar">
                <div 
                    class="capacity-fill" 
                    class:capacity-warning={(currentCapacityBytes / BLOCKCHAIN_CONFIG.maxBlockSizeBytes) > 0.8}
                    class:capacity-full={isBlockFull}
                    style="width: {Math.min((currentCapacityBytes / BLOCKCHAIN_CONFIG.maxBlockSizeBytes) * 100, 100)}%"
                ></div>
            </div>
            <div class="capacity-text">
                {((currentCapacityBytes / BLOCKCHAIN_CONFIG.maxBlockSizeBytes) * 100).toFixed(1)}% Used
            </div>
        </div>
        
        <!-- Arrival and departure zones removed for cleaner look -->
    </div>
</div>

<style>
    /* UNCHANGED - basic container styles */
    .transaction-packing-container {
        width: 100%;
        max-width: 900px;
        min-height: 400px;
    }
    
    .transaction-packing-area {
        position: relative;
        margin: 0 auto;
        border: 3px solid var(--primary-orange);
        border-radius: 12px;
        background: linear-gradient(135deg, var(--darker-bg) 0%, var(--dark-bg) 100%);
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(230, 126, 34, 0.3);
        transition: all 0.3s ease;
    }
    
    .transaction-packing-area.block-flow-active {
        border-color: #27ae60;
        box-shadow: 0 8px 32px rgba(39, 174, 96, 0.3);
    }
    
    .transaction-packing-area.mining-active {
        border-color: #f39c12;
        box-shadow: 0 8px 32px rgba(243, 156, 18, 0.4);
        animation: miningPulse 2s ease-in-out infinite alternate;
    }
    
    @keyframes miningPulse {
        from { 
            box-shadow: 0 8px 32px rgba(243, 156, 18, 0.4);
        }
        to { 
            box-shadow: 0 12px 40px rgba(243, 156, 18, 0.6);
        }
    }
    
    .transaction-packing-area.block-full {
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
    
    /* UNCHANGED - label styles with new mining indicator */
    .block-label {
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(230, 126, 34, 0.9);
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
    
    .mining-indicator {
        background: #f39c12;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 700;
        animation: miningFlash 1s ease-in-out infinite alternate;
    }
    
    @keyframes miningFlash {
        from { opacity: 1; background: #f39c12; }
        to { opacity: 0.7; background: #e67e22; }
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
    
    /* Side zones removed for cleaner interface */
    
    /* UNCHANGED - algorithm status */
    .algorithm-status {
        position: absolute;
        top: 60px;
        right: 15px;
        background: rgba(52, 152, 219, 0.9);
        color: white;
        padding: 8px 16px;
        border-radius: 15px;
        font-size: 12px;
        font-weight: 500;
        box-shadow: 0 3px 10px rgba(52, 152, 219, 0.3);
        animation: algorithmPulse 1.5s infinite ease-in-out;
    }
    
    @keyframes algorithmPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.05); }
    }
    
    /* UNCHANGED - capacity indicator */
    .capacity-indicator {
        position: absolute;
        top: 15px;
        right: 15px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        background: rgba(0, 0, 0, 0.8);
        padding: 10px;
        border-radius: 12px;
        z-index: 15;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(230, 126, 34, 0.3);
        min-width: 100px;
    }
    
    .capacity-bar {
        width: 80px;
        height: 6px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        overflow: hidden;
    }
    
    .capacity-fill {
        height: 100%;
        background: linear-gradient(90deg, #27ae60 0%, #f39c12 70%, #e74c3c 100%);
        transition: width 0.5s ease;
        border-radius: 3px;
    }
    
    .capacity-fill.capacity-warning {
        background: linear-gradient(90deg, #f39c12 0%, #e67e22 100%);
    }
    
    .capacity-fill.capacity-full {
        background: linear-gradient(90deg, #e74c3c 0%, #c0392b 100%);
    }
    
    .capacity-text {
        color: #ecf0f1;
        font-size: 11px;
        font-weight: 600;
        text-align: center;
    }
    
    /* UNCHANGED - transaction square styling */
    :global(.transaction-square) {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    :global(.transaction-square.moving) {
        z-index: 50 !important;
        border-color: #f39c12 !important;
        filter: brightness(1.1);
    }
    
    :global(.transaction-square.wallet-transaction) {
        animation: walletGlow 2s ease-in-out infinite alternate;
    }
    
    @keyframes walletGlow {
        from { 
            box-shadow: 0 0 15px rgba(243, 156, 18, 0.8);
            transform: scale(1);
        }
        to { 
            box-shadow: 0 0 20px rgba(243, 156, 18, 1);
            transform: scale(1.02);
        }
    }
    
    :global(.transaction-square[data-type="donation"]) {
        animation: donationGlow 3s infinite ease-in-out;
    }
    
    :global(.transaction-square[data-type="test"]) {
        animation: testGlow 2s infinite ease-in-out;
    }
    
    @keyframes donationGlow {
        0%, 100% { box-shadow: 0 0 8px #e74c3c40; }
        50% { box-shadow: 0 0 12px #e74c3c80; }
    }
    
    @keyframes testGlow {
        0%, 100% { box-shadow: 0 0 8px #f39c1240; }
        50% { box-shadow: 0 0 12px #f39c1280; }
    }
    
    /* NEW - mining sweep line styling */
    :global(.mining-sweep-line) {
        transition: left 0.1s linear, opacity 0.5s ease;
    }
    
    /* UNCHANGED - tooltip styling (preserved exactly) */
    :global(.transaction-tooltip) {
        position: absolute !important;
        background: linear-gradient(135deg, #1a2332 0%, #0f1419 100%) !important;
        border: 2px solid #e67e22 !important;
        padding: 12px !important;
        border-radius: 8px !important;
        font-size: 12px !important;
        color: #ecf0f1 !important;
        pointer-events: none !important;
        z-index: 1000 !important;
        white-space: nowrap !important;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        display: block !important;
        max-width: 300px !important;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
    }
    
    /* UNCHANGED - responsive adjustments */
    @media (max-width: 768px) {
        .block-label {
            font-size: 12px;
            padding: 6px 12px;
        }
        
        .capacity-indicator {
            padding: 8px;
            min-width: 80px;
        }
        
        .capacity-bar {
            width: 60px;
        }
        

    }
    
    @media (max-width: 480px) {
        .block-label {
            font-size: 11px;
            padding: 4px 8px;
        }
        
        .capacity-indicator {
            padding: 6px;
            min-width: 70px;
        }
        
        .capacity-bar {
            width: 50px;
            height: 4px;
        }
        
        .capacity-text {
            font-size: 10px;
        }
        
    }
</style>