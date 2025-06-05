<!-- Simplified TransactionPackingGrid.svelte -->
<script>
    import { transactions, walletConnector, blockData } from '$lib/stores.js';
    import { onMount, onDestroy } from 'svelte';
    import { Transaction } from '$lib/Transaction.js';
    import { GravityPackingAlgorithm } from '$lib/PackingAlgorithm.js';
    import { BlockFlowManager } from '$lib/BlockFlowManager.js';
    
    // BLOCKCHAIN CONFIGURATION
    const BLOCKCHAIN_CONFIG = {
        maxBlockSizeBytes: 2 * 1024 * 1024, // 2MB block capacity
        containerWidth: 800,
        containerHeight: 600,
        animationDelay: 60 // ms between transaction animations
    };
    
    // Component state
    let packingContainer;
    let transactionObjects = [];
    let packingAlgorithm;
    let isPackingActive = false;
    let blockFlowManager;
    let blockFlowActive = false;
    let lastBlockHeight = 0; // Track last known block height
    
    // Capacity tracking
    let currentCapacityBytes = 0;
    let isBlockFull = false;
    
    // Export stats for parent component
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
    
    // Initialize packing algorithm
    onMount(() => {
        if (packingContainer) {
            packingAlgorithm = new GravityPackingAlgorithm(
                BLOCKCHAIN_CONFIG.containerWidth,
                BLOCKCHAIN_CONFIG.containerHeight,
                BLOCKCHAIN_CONFIG.maxBlockSizeBytes
            );
            
            console.log('📦 Transaction Packing Grid initialized');
            
            // Initialize with existing transactions if any
            if ($transactions.length > 0) {
                initializeFromExistingTransactions();
            }
        }
    });
    
    // Watch for transaction changes and auto-repack
    $: if ($transactions.length >= 0 && packingAlgorithm) {
        handleTransactionChanges();
    }
    
    // Watch for new blocks and auto-repack
    $: if ($blockData.length > 0 && packingAlgorithm && transactionObjects.length > 0) {
        handleNewBlock();
    }
    
    // Watch for wallet changes to update highlighting
    $: if ($walletConnector.connectedAddress && transactionObjects.length > 0) {
        updateWalletHighlighting();
    }
    
    function initializeFromExistingTransactions() {
        console.log(`📥 Loading ${$transactions.length} existing transactions`);
        
        // Clear existing transaction objects
        clearAllTransactionsInternal();
        
        // Create transaction objects from store data
        transactionObjects = $transactions.map(txData => 
            new Transaction(txData, $walletConnector.connectedAddress)
        );
        
        // Run packing algorithm
        runPackingAlgorithm();
    }
    
    function handleTransactionChanges() {
        // Detect new transactions
        const existingIds = new Set(transactionObjects.map(tx => tx.id));
        const newTransactions = $transactions.filter(txData => !existingIds.has(txData.id));
        
        if (newTransactions.length > 0) {
            console.log(`📥 Adding ${newTransactions.length} new transactions - auto-repacking`);
            
            // Create new transaction objects
            const newTxObjects = newTransactions.map(txData => 
                new Transaction(txData, $walletConnector.connectedAddress)
            );
            
            transactionObjects = [...transactionObjects, ...newTxObjects];
            runPackingAlgorithm(); // Auto-repack
        }
        
        // Detect removed transactions
        const currentIds = new Set($transactions.map(tx => tx.id));
        const removedTransactions = transactionObjects.filter(tx => !currentIds.has(tx.id));
        
        if (removedTransactions.length > 0) {
            console.log(`📤 Removing ${removedTransactions.length} transactions - auto-repacking`);
            
            // Remove transaction objects
            removedTransactions.forEach(tx => tx.destroy());
            transactionObjects = transactionObjects.filter(tx => currentIds.has(tx.id));
            runPackingAlgorithm(); // Auto-repack
        }
    }
    
    function handleNewBlock() {
        // Check if we have block data and if there's a new block
        if ($blockData.length === 0) return;
        
        const latestBlock = $blockData[0];
        const currentBlockHeight = latestBlock.height;
        
        // If this is a new block (height increased)
        if (lastBlockHeight > 0 && currentBlockHeight > lastBlockHeight) {
            console.log(`🎉 New block mined: ${lastBlockHeight} → ${currentBlockHeight} - auto-repacking transactions`);
            
            // Show notification about block mining
            showCapacityStatus(`🎉 Block ${currentBlockHeight} mined! Repacking remaining transactions...`, 'success');
            
            // Auto-repack after a short delay to allow transaction data to update
            setTimeout(() => {
                if (transactionObjects.length > 0) {
                    console.log(`🔄 Auto-repacking ${transactionObjects.length} remaining transactions after block mining`);
                    runPackingAlgorithm();
                }
            }, 1000); // 1 second delay to allow mempool to update
        }
        
        // Update last known block height
        lastBlockHeight = currentBlockHeight;
    }
    
    function updateWalletHighlighting() {
        transactionObjects.forEach(tx => {
            tx.isWallet = tx.isWallet || (
                $walletConnector.connectedAddress && 
                (tx.inputs?.some(input => input.address === $walletConnector.connectedAddress) ||
                 tx.outputs?.some(output => output.address === $walletConnector.connectedAddress))
            );
            
            // Update visual styling if element exists
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
    
    async function runPackingAlgorithm() {
        if (isPackingActive || !packingAlgorithm || !packingContainer) {
            return;
        }
        
        isPackingActive = true;
        showPackingStatus(true);
        
        console.log(`🔄 Running packing algorithm for ${transactionObjects.length} transactions`);
        
        // Run the gravity-based packing algorithm
        const positions = packingAlgorithm.packTransactions(transactionObjects);
        
        // Animate transactions to their new positions
        let animationDelay = 0;
        
        for (const { transaction, x, y } of positions) {
            // Create DOM element if it doesn't exist
            if (!transaction.element) {
                transaction.createElement(packingContainer);
            }
            
            // Animate to position with staggered timing
            transaction.animateToPosition(x, y, animationDelay);
            transaction.placed = true;
            
            animationDelay += BLOCKCHAIN_CONFIG.animationDelay;
        }
        
        // Update capacity tracking
        updateCapacityTracking();
        
        // Wait for animations to complete
        setTimeout(() => {
            isPackingActive = false;
            showPackingStatus(false);
            updatePackingStats();
            
            // Validate packing for debugging
            if (packingAlgorithm.validatePacking()) {
                console.log('✅ Packing completed successfully');
            } else {
                console.warn('⚠️ Packing validation failed');
            }
        }, animationDelay + 600);
    }
    
    function updateCapacityTracking() {
        currentCapacityBytes = transactionObjects
            .filter(tx => tx.placed)
            .reduce((sum, tx) => sum + tx.sizeBytes, 0);
        
        const utilizationPercent = (currentCapacityBytes / BLOCKCHAIN_CONFIG.maxBlockSizeBytes) * 100;
        const wasBlockFull = isBlockFull;
        isBlockFull = utilizationPercent >= 95; // Consider full at 95%
        
        // Show capacity warnings
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
            // Additional stats for display
            avgSizeKB: stats.avgSizeKB,
            visualUtilization: stats.visualUtilization,
            remainingCapacity: stats.remainingCapacity
        };
    }
    
    function showCapacityStatus(message, type = 'info') {
        // Remove existing status
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
    
    // Internal clear function (doesn't affect store)
    function clearAllTransactionsInternal() {
        transactionObjects.forEach(tx => tx.destroy());
        transactionObjects = [];
        currentCapacityBytes = 0;
        isBlockFull = false;
    }
    
    // Export functions for parent component controls
    export function addDummyTransactions() {
        console.log('🎭 Adding dummy transactions for testing');
        
        const dummyCount = 12;
        const dummyTransactions = [];
        
        for (let i = 0; i < dummyCount; i++) {
            const dummyTx = {
                id: `dummy_${Date.now()}_${i}`,
                size: 800 + Math.random() * 15000, // 0.8KB to 15.8KB
                value: 0.1 + Math.random() * 5,
                usd_value: (0.1 + Math.random() * 5) * 1.5,
                inputs: [],
                outputs: [],
                isDummy: true
            };
            
            // Check capacity before adding
            const dummyTxObj = new Transaction(dummyTx, $walletConnector.connectedAddress);
            if (currentCapacityBytes + dummyTxObj.sizeBytes <= BLOCKCHAIN_CONFIG.maxBlockSizeBytes) {
                dummyTransactions.push(dummyTx);
            }
        }
        
        // Add to transactions store (will trigger reactive update and auto-repack)
        $transactions = [...$transactions, ...dummyTransactions];
        
        showCapacityStatus(`Added ${dummyTransactions.length} dummy transactions`, 'success');
    }
    
    export function clearAllTransactions() {
        console.log('🗑️ Clearing all transactions');
        
        // Destroy all transaction elements
        clearAllTransactionsInternal();
        
        // Clear the transactions store (will trigger reactive update)
        $transactions = [];
        
        updatePackingStats();
        showCapacityStatus('All transactions cleared', 'info');
    }
    
    export function repackTransactions() {
        console.log('🔄 Manually repacking all transactions');
        runPackingAlgorithm();
    }
    
    export function getPackingStats() {
        return packingStats;
    }
    
    // Block Flow Integration (optional - keep existing functionality)
    export function toggleBlockFlow() {
        blockFlowActive = !blockFlowActive;
        
        if (blockFlowActive && !blockFlowManager) {
            // Initialize block flow manager if needed
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
    
    export function triggerTestBlockMining() {
        if (blockFlowManager) {
            blockFlowManager.triggerTestBlockMining();
        } else {
            console.log('🧪 Simulating block mining - removing some transactions');
            
            // Remove 20-30% of transactions to simulate mining
            const removeCount = Math.floor(transactionObjects.length * 0.25);
            const removedTxIds = transactionObjects.slice(0, removeCount).map(tx => tx.id);
            
            // Remove from store (will trigger reactive update and auto-repack)
            $transactions = $transactions.filter(storeTx => !removedTxIds.includes(storeTx.id));
            
            showCapacityStatus(`Block mined! ${removeCount} transactions confirmed`, 'success');
        }
    }
    
    export function triggerTestTransactionEntry() {
        if (blockFlowManager) {
            blockFlowManager.triggerTestTransactionEntry();
        } else {
            console.log('🧪 Simulating new transactions arriving');
            addDummyTransactions();
        }
    }
    
    // Cleanup on component destroy
    onDestroy(() => {
        console.log('🧹 Cleaning up Transaction Packing Grid');
        
        clearAllTransactionsInternal();
        
        if (blockFlowManager) {
            blockFlowManager.destroy();
        }
        
        // Remove any remaining status notifications
        const statusElements = document.querySelectorAll('.capacity-status');
        statusElements.forEach(el => el.remove());
    });
</script>

<div class="transaction-packing-container">
    <div 
        class="transaction-packing-area" 
        class:block-full={isBlockFull}
        class:block-flow-active={blockFlowActive}
        bind:this={packingContainer}
    >
        <!-- Block Label -->
        <div class="block-label">
            Transaction Packing: 2MB Block
            {#if blockFlowActive}
                <span class="flow-indicator">🎬 LIVE</span>
            {/if}
            {#if isBlockFull}
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
    </div>
</div>

<style>
    .transaction-packing-container {
        width: 100%;
        max-width: 900px;
        min-height: 400px;
    }
    
    .transaction-packing-area {
        position: relative;
        width: 800px;
        height: 600px;
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
    
    /* Transaction square styling */
    :global(.transaction-square) {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    :global(.transaction-square.moving) {
        z-index: 50 !important;
        border-color: #3498db !important;
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
    
    /* Responsive adjustments */
    @media (max-width: 900px) {
        .transaction-packing-area {
            width: 100%;
            height: 500px;
        }
    }
    
    @media (max-width: 600px) {
        .transaction-packing-area {
            height: 400px;
        }
        
        .block-label {
            font-size: 12px;
            padding: 6px 12px;
        }
        
        .capacity-indicator {
            padding: 8px;
            min-width: 80px;
        }
    }
</style>