<!-- UPDATED +page.svelte with Header Integration, Clean Design, and Origin Activity Panel -->

<script>
    import { onMount, onDestroy } from 'svelte';
    import { transactions, currentPrice, blockData, walletConnector } from '$lib/stores.js';
    import { fetchTransactions, fetchBlocks, fetchPrice, addUsdValues } from '$lib/api.js';
    import { processTransactionForOrigins } from '$lib/transactionOrigins.js';
    
    // Import components
    import Header from '$lib/components/Header.svelte';
    import BlocksSection from '$lib/components/BlocksSection.svelte';
    import StatsDisplay from '$lib/components/StatsDisplay.svelte';
    import OriginActivityPanel from '$lib/components/OriginActivityPanel.svelte';
    import Footer from '$lib/components/Footer.svelte';
    
    // Lazy import for non-default components
    let MempoolGrid, ErgoPackingGrid, BallPhysicsGrid, TransactionTable;
    
    // Always import TransactionPackingGrid since it's default
    import TransactionPackingGrid from '$lib/components/TransactionPackingGrid.svelte';
    
    // Import global styles
    import '../app.css';
    
    let intervalIds = [];
    let currentMode = 'pack'; // Default to TransactionPackingGrid
    let ergoPackingRef;
    let ballPhysicsRef;
    let transactionPackingRef;
    let headerRef;
    let currentPackingStats = {
        blockCapacity: 2000000,
        mempoolSize: 0,
        utilization: 0,
        totalTransactions: 0,
        packedTransactions: 0,
        efficiency: 0,
        status: 'Ready to pack',
        statusClass: 'info'
    };
    
    // Data persistence and error tracking
    let lastSuccessfulLoad = {
        transactions: null,
        blocks: null,
        price: null
    };
    
    let apiStatus = {
        transactions: { working: true, lastError: null, consecutiveFailures: 0 },
        blocks: { working: true, lastError: null, consecutiveFailures: 0 },
        price: { working: true, lastError: null, consecutiveFailures: 0 }
    };
    
    // Loading states
    let coreDataLoaded = false;
    let componentsReady = false;
    let initialLoadComplete = false;
    let loadingStage = 'price'; // 'price' -> 'basic' -> 'transactions' -> 'complete'
    
    // Status notifications
    let showApiStatus = false;
    let statusMessage = '';
    let statusType = 'info';
    
    // Lazy load other components only when needed
    $: if (currentMode !== 'pack' && !MempoolGrid) {
        loadOtherComponents();
    }
    
    async function loadOtherComponents() {
        if (!MempoolGrid) {
            const { default: MempoolGridComponent } = await import('$lib/components/MempoolGrid.svelte');
            MempoolGrid = MempoolGridComponent;
        }
        if (!ErgoPackingGrid) {
            const { default: ErgoPackingGridComponent } = await import('$lib/components/ErgoPackingGrid.svelte');
            ErgoPackingGrid = ErgoPackingGridComponent;
        }
        if (!BallPhysicsGrid) {
            const { default: BallPhysicsGridComponent } = await import('$lib/components/BallPhysicsGrid.svelte');
            BallPhysicsGrid = BallPhysicsGridComponent;
        }
        if (!TransactionTable) {
            const { default: TransactionTableComponent } = await import('$lib/components/TransactionTable.svelte');
            TransactionTable = TransactionTableComponent;
        }
    }
    
    // Show API status notifications
    function showStatusNotification(message, type = 'info', duration = 4000) {
        statusMessage = message;
        statusType = type;
        showApiStatus = true;
        
        setTimeout(() => {
            showApiStatus = false;
        }, duration);
        
        console.log(`📢 Status: ${type.toUpperCase()} - ${message}`);
    }
    
    // API error handling with data persistence
    function handleApiError(endpoint, error, data = null) {
        apiStatus[endpoint].lastError = error.message || error;
        apiStatus[endpoint].consecutiveFailures++;
        apiStatus[endpoint].working = false;
        
        const failureCount = apiStatus[endpoint].consecutiveFailures;
        
        if (data && data.error && data.fallback === 'preserve_existing') {
            console.log(`📦 Preserving existing ${endpoint} data due to API failure`);
            showStatusNotification(
                `${endpoint} API unavailable, showing last known data`,
                'warning',
                6000
            );
        } else if (failureCount === 1) {
            showStatusNotification(
                `${endpoint} API error: ${error.message || error}`,
                'error',
                5000
            );
        } else if (failureCount >= 3) {
            showStatusNotification(
                `${endpoint} API failing repeatedly (${failureCount}x), using fallback`,
                'error',
                8000
            );
        }
        
        console.error(`❌ ${endpoint} API error (failure #${failureCount}):`, error);
    }
    
    // Track successful API calls
    function handleApiSuccess(endpoint) {
        const wasDown = !apiStatus[endpoint].working;
        
        apiStatus[endpoint].working = true;
        apiStatus[endpoint].lastError = null;
        apiStatus[endpoint].consecutiveFailures = 0;
        
        if (wasDown) {
            showStatusNotification(
                `${endpoint} API restored`,
                'success',
                3000
            );
        }
        
        console.log(`✅ ${endpoint} API working normally`);
    }
    
    function getDisplayModeName(mode) {
        switch(mode) {
            case 'grid': return 'Grid View';
            case 'hex': return 'Hexagon Packing';
            case 'pack': return 'Transaction Packing';
            case 'ball': return 'Ball Physics';
            default: return 'Unknown';
        }
    }
    
    // Handle mode changes from Header
    function handleModeChange(mode) {
        console.log(`📱 Header: Mode changed to ${mode}`);
        currentMode = mode;
        
        // Trigger specific actions for certain modes
        if (mode === 'hex') {
            setTimeout(() => {
                if (ergoPackingRef && ergoPackingRef.startPackingAnimation) {
                    console.log('🎬 Auto-starting hexagon packing animation');
                    ergoPackingRef.startPackingAnimation();
                }
            }, 500);
        }
    }
    
    // Handle refresh from Header
    async function handleRefresh() {
        console.log('🔄 Header: Refreshing all data...');
        showStatusNotification('Refreshing all data...', 'info', 2000);
        
        try {
            await Promise.all([
                loadPrice(),
                loadBlocks(),
                loadTransactionsOptimized()
            ]);
            
            console.log('✅ All data refresh completed');
            showStatusNotification('Data refreshed successfully', 'success', 2000);
        } catch (error) {
            console.error('❌ Error during full data refresh:', error);
            showStatusNotification('Some data could not be refreshed', 'warning', 4000);
        }
    }
    
    // Add Test Transactions function (to be called from StatsDisplay and Header)
    function handleAddTestTransactions() {
        console.log('🎭 Adding test transactions based on current mode:', currentMode);
        
        if (currentMode === 'pack' && transactionPackingRef) {
            transactionPackingRef.addDummyTransactions();
            showStatusNotification('✅ Added test transactions to packing grid', 'success');
        } else if (currentMode === 'ball' && ballPhysicsRef) {
            ballPhysicsRef.addDummyTransactions();
            showStatusNotification('✅ Added test transactions to ball physics', 'success');
        } else if (currentMode === 'hex' && ergoPackingRef) {
            // For hex mode, we might want to refresh the packing or add some demo data
            if (ergoPackingRef.startPackingAnimation) {
                ergoPackingRef.startPackingAnimation();
                showStatusNotification('🎬 Started hexagon packing animation', 'success');
            }
        } else {
            showStatusNotification('ℹ️ Test transactions not available for current mode', 'info');
        }
    }
    
    // Repack function (NEW - to be called from Header)
    function handleRepack() {
        console.log('🔄 Repacking based on current mode:', currentMode);
        
        if (currentMode === 'pack' && transactionPackingRef) {
            transactionPackingRef.repackTransactions();
            showStatusNotification('🔄 Repacking transactions with gravity algorithm', 'info');
        } else if (currentMode === 'ball' && ballPhysicsRef) {
            // For ball physics, clear and reload transactions
            ballPhysicsRef.clearBalls();
            setTimeout(() => {
                if (ballPhysicsRef) {
                    ballPhysicsRef.addDummyTransactions();
                }
            }, 500);
            showStatusNotification('🔄 Reorganizing ball physics', 'info');
        } else if (currentMode === 'hex' && ergoPackingRef) {
            // For hex mode, restart animation
            if (ergoPackingRef.startPackingAnimation) {
                ergoPackingRef.startPackingAnimation();
                showStatusNotification('🔄 Restarting hexagon packing', 'info');
            }
        } else {
            showStatusNotification('ℹ️ Repack not available for current mode', 'info');
        }
    }
    
    onMount(async () => {
        console.log('🚀 Ergomempool SvelteKit app initialized - WITH ORIGIN ACTIVITY PANEL');
        
        // Stage 1: Load price first (fastest)
        loadingStage = 'price';
        await loadPrice();
        
        // Stage 2: Load basic data in parallel
        loadingStage = 'basic';
        const basicDataPromise = loadBlocks();
        
        // Stage 3: Start loading minimal transactions for faster initial render
        loadingStage = 'transactions';
        const transactionsPromise = loadTransactionsOptimized();
        
        // Wait for core data
        await Promise.all([basicDataPromise, transactionsPromise]);
        coreDataLoaded = true;
        
        // Stage 4: Complete initialization
        loadingStage = 'complete';
        initialLoadComplete = true;
        
        // Set up auto-refresh intervals
        const transactionInterval = setInterval(() => {
            loadTransactionsOptimized().catch(error => {
                console.error('🔄 Auto-refresh transaction error:', error);
            });
        }, 45000);
        
        const priceInterval = setInterval(() => {
            loadPrice().catch(error => {
                console.error('🔄 Auto-refresh price error:', error);
            });
        }, 300000);
        
        const blockInterval = setInterval(() => {
            loadBlocks().catch(error => {
                console.error('🔄 Auto-refresh block error:', error);
            });
        }, 60000);
        
        intervalIds = [transactionInterval, priceInterval, blockInterval];
        
        console.log('⏰ Auto-refresh intervals set up');
        
        // Load transaction table component lazily after initial render
        setTimeout(() => {
            loadOtherComponents();
        }, 1000);
    });
    
    onDestroy(() => {
        intervalIds.forEach(id => clearInterval(id));
        console.log('🧹 Cleaned up intervals');
    });
    
    // ENHANCED: Transaction loading with origin detection and data persistence
    async function loadTransactionsOptimized() {
        try {
            console.log('📊 Loading transactions with origin detection...');
            const txData = await fetchTransactions();
            
            if (txData && txData.error && txData.serverData) {
                handleApiError('transactions', new Error(txData.error), txData.serverData);
                
                if (txData.serverData.fallback === 'preserve_existing' && lastSuccessfulLoad.transactions) {
                    console.log('📦 Using preserved transaction data');
                    return;
                } else {
                    if (!lastSuccessfulLoad.transactions) {
                        transactions.set([]);
                    }
                    return;
                }
            }
            
            const priceData = await fetchPrice();
            
            const maxTransactions = initialLoadComplete ? txData.length : Math.min(txData.length, 100);
            const limitedTxData = txData.slice(0, maxTransactions);
            
            // Add USD values
            const txWithUsd = addUsdValues(limitedTxData, priceData.price);
            
            // ENHANCED: Ensure origin detection is applied and wallet detection is current
            const txWithOriginsAndUsd = txWithUsd.map(tx => {
                if (!tx.origin) {
                    // Apply origin detection if not already present
                    const processed = processTransactionForOrigins(tx, $walletConnector.connectedAddress);
                    console.log(`🔍 Applied origin detection to tx ${tx.id?.substring(0, 8)}...: ${processed.origin}`);
                    return processed;
                } else {
                    // Update wallet detection with current wallet address
                    return {
                        ...tx,
                        isWallet: $walletConnector.connectedAddress && (
                            tx.inputs?.some(input => input.address === $walletConnector.connectedAddress) ||
                            tx.outputs?.some(output => output.address === $walletConnector.connectedAddress)
                        )
                    };
                }
            });
            
            transactions.set(txWithOriginsAndUsd);
            lastSuccessfulLoad.transactions = new Date();
            handleApiSuccess('transactions');
            
            // Log origin distribution
            const originCounts = txWithOriginsAndUsd.reduce((counts, tx) => {
                counts[tx.origin] = (counts[tx.origin] || 0) + 1;
                return counts;
            }, {});
            
            console.log(`📊 Loaded ${txWithOriginsAndUsd.length}/${txData.length} transactions with origins:`, originCounts);
            
            if (!initialLoadComplete && txData.length > 100) {
                setTimeout(() => {
                    const remainingTxData = txData.slice(100);
                    const remainingTxWithUsd = addUsdValues(remainingTxData, priceData.price);
                    
                    // Apply origin detection to remaining transactions
                    const remainingTxWithOrigins = remainingTxWithUsd.map(tx => {
                        if (!tx.origin) {
                            return processTransactionForOrigins(tx, $walletConnector.connectedAddress);
                        }
                        return tx;
                    });
                    
                    transactions.update(current => [...current, ...remainingTxWithOrigins]);
                    console.log(`📊 Loaded remaining ${remainingTxData.length} transactions in background`);
                }, 2000);
            }
        } catch (error) {
            console.error('❌ Error loading transactions:', error);
            handleApiError('transactions', error);
            
            if (!lastSuccessfulLoad.transactions) {
                transactions.set([]);
            } else {
                console.log('📦 Keeping existing transaction data due to API error');
            }
        }
    }
    
    // Price loading with persistence
    async function loadPrice() {
        try {
            const priceData = await fetchPrice();
            currentPrice.set(priceData.price);
            lastSuccessfulLoad.price = new Date();
            handleApiSuccess('price');
            console.log(`💰 Current ERG price: $${priceData.price}`);
        } catch (error) {
            console.error('❌ Error loading price:', error);
            handleApiError('price', error);
            
            if (!lastSuccessfulLoad.price) {
                currentPrice.set(1.0);
            } else {
                console.log('📦 Keeping existing price data due to API error');
            }
        }
    }
    
    // Block loading with persistence
    async function loadBlocks() {
        try {
            console.log('🧱 Loading blocks...');
            const blocks = await fetchBlocks();
            
            if (blocks && blocks.error && blocks.serverData) {
                handleApiError('blocks', new Error(blocks.error), blocks.serverData);
                
                if (blocks.serverData.fallback === 'preserve_existing' && lastSuccessfulLoad.blocks) {
                    console.log('📦 Using preserved block data');
                    return;
                } else {
                    if (!lastSuccessfulLoad.blocks) {
                        blockData.set([]);
                    }
                    return;
                }
            }
            
            blockData.set(blocks);
            lastSuccessfulLoad.blocks = new Date();
            handleApiSuccess('blocks');
            console.log(`🧱 Loaded ${blocks.length} blocks`);
        } catch (error) {
            console.error('❌ Error loading blocks:', error);
            handleApiError('blocks', error);
            
            if (!lastSuccessfulLoad.blocks) {
                blockData.set([]);
            } else {
                console.log('📦 Keeping existing block data due to API error');
            }
        }
    }
</script>

<svelte:head>
    <title>Ergomempool</title>
    <meta name="description" content="Real-time Ergo blockchain mempool visualizer with transaction packing simulation">
    <meta name="keywords" content="Ergo, blockchain, mempool, visualization, cryptocurrency">
    <link rel="preload" href="/Ergomempool_logo_f.svg" as="image">
</svelte:head>

<!-- API Status Notification -->
{#if showApiStatus}
    <div class="api-status-notification {statusType}">
        <div class="status-icon">
            {#if statusType === 'success'}
                ✅
            {:else if statusType === 'warning'}
                ⚠️
            {:else if statusType === 'error'}
                ❌
            {:else}
                ℹ️
            {/if}
        </div>
        <div class="status-message">{statusMessage}</div>
    </div>
{/if}

<div class="container">
    <!-- Clean Header with Navigation -->
    <Header 
        bind:this={headerRef}
        {currentMode}
        onModeChange={handleModeChange}
        onRefresh={handleRefresh}
        onAddTestTransactions={handleAddTestTransactions}
        onRepack={handleRepack}
    />

    <!-- Blocks Section -->
    <BlocksSection />
    
    <main class="visualizer" 
          class:hex-mode={currentMode === 'hex'} 
          class:pack-mode={currentMode === 'pack'} 
          class:ball-mode={currentMode === 'ball'}
          class:grid-mode={currentMode === 'grid'}>
        <h2>Mempool Visualizer</h2>
        
        <!-- Stats Display with Add Test Transactions button -->
        <StatsDisplay 
            packingStats={currentPackingStats} 
            {currentMode}
            onAddTestTransactions={handleAddTestTransactions}
        />
        
        <!-- NEW: Origin Activity Panel -->
        <OriginActivityPanel />
        
        <!-- Dynamic Content Based on Current Mode -->
        {#if coreDataLoaded}
            {#if currentMode === 'pack'}
                <!-- Transaction Packing Mode (DEFAULT - Always loaded) -->
                <TransactionPackingGrid 
                    bind:this={transactionPackingRef}
                    bind:packingStats={currentPackingStats}
                />
            {:else if currentMode === 'hex' && ErgoPackingGrid}
                <!-- Hexagon Packing Mode (Lazy loaded) -->
                <svelte:component 
                    this={ErgoPackingGrid}
                    bind:this={ergoPackingRef}
                    packingStats={currentPackingStats} 
                />
            {:else if currentMode === 'ball' && BallPhysicsGrid}
                <!-- Ball Physics Mode (Lazy loaded) -->
                <svelte:component 
                    this={BallPhysicsGrid}
                    bind:this={ballPhysicsRef}
                    packingStats={currentPackingStats} 
                />
            {:else if currentMode === 'grid' && MempoolGrid}
                <!-- Grid Mode (Lazy loaded) -->
                <svelte:component this={MempoolGrid} />
            {:else}
                <!-- Loading placeholder for lazy-loaded components -->
                <div class="lazy-loading-container">
                    <div class="lazy-loading-spinner"></div>
                    <div class="lazy-loading-text">Loading {getDisplayModeName(currentMode)}...</div>
                </div>
            {/if}
        {:else}
            <!-- Initial loading state -->
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">
                    {#if loadingStage === 'price'}
                        Loading price data...
                    {:else if loadingStage === 'basic'}
                        Loading blockchain data...
                    {:else if loadingStage === 'transactions'}
                        Loading transactions...
                    {:else}
                        Initializing packing algorithm...
                    {/if}
                </div>
                <div class="loading-progress">
                    <div class="progress-bar" class:stage-price={loadingStage === 'price'} class:stage-basic={loadingStage === 'basic'} class:stage-transactions={loadingStage === 'transactions'} class:stage-complete={loadingStage === 'complete'}></div>
                </div>
            </div>
        {/if}
    </main>
    
    <!-- Lazy load TransactionTable -->
    {#if TransactionTable && initialLoadComplete}
        <svelte:component this={TransactionTable} />
    {/if}
    
    <Footer />
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background: linear-gradient(135deg, var(--darker-bg) 0%, var(--dark-bg) 100%);
    }
    
    /* API Status Notification Styling */
    .api-status-notification {
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 400px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        border: 1px solid transparent;
        animation: slideInRight 0.3s ease-out;
    }
    
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .api-status-notification.success {
        background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
        color: white;
        border-color: #2ecc71;
    }
    
    .api-status-notification.warning {
        background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
        color: white;
        border-color: #f39c12;
    }
    
    .api-status-notification.error {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        color: white;
        border-color: #e74c3c;
    }
    
    .api-status-notification.info {
        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
        color: white;
        border-color: #3498db;
    }
    
    .status-icon {
        font-size: 16px;
        flex-shrink: 0;
    }
    
    .status-message {
        flex: 1;
        line-height: 1.4;
    }
    
    .visualizer {
        flex: 1;
        background: linear-gradient(135deg, var(--dark-bg) 0%, var(--darker-bg) 100%);
        padding: 25px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        min-height: 400px;
        border-top: 1px solid var(--border-color);
        transition: all 0.3s ease;
    }
    
    .visualizer h2 {
        margin-top: 0;
        margin-bottom: 25px;
        color: var(--primary-orange);
        font-size: 28px;
        text-shadow: 0 2px 4px rgba(230, 126, 34, 0.3);
        text-align: center;
        transition: all 0.3s ease;
    }
    
    .visualizer.grid-mode {
        background: linear-gradient(135deg, var(--dark-bg) 0%, var(--darker-bg) 100%);
    }
    
    .visualizer.grid-mode h2 {
        color: var(--primary-orange);
    }
    
    .visualizer.hex-mode {
        min-height: 600px;
        background: linear-gradient(135deg, rgba(230, 126, 34, 0.05) 0%, var(--dark-bg) 100%);
    }
    
    .visualizer.hex-mode h2 {
        color: var(--primary-orange);
        font-size: 28px;
        text-align: center;
        margin-bottom: 20px;
    }
    
    .visualizer.pack-mode {
        min-height: 700px;
        background: linear-gradient(135deg, rgba(52, 152, 219, 0.05) 0%, var(--dark-bg) 100%);
    }
    
    .visualizer.pack-mode h2 {
        color: #3498db;
        font-size: 28px;
        text-align: center;
        margin-bottom: 20px;
        text-shadow: 0 2px 4px rgba(52, 152, 219, 0.3);
    }
    
    .visualizer.ball-mode {
        min-height: 700px;
        background: linear-gradient(135deg, rgba(212, 101, 27, 0.05) 0%, var(--dark-bg) 100%);
    }
    
    .visualizer.ball-mode h2 {
        color: #d4651b;
        font-size: 28px;
        text-align: center;
        margin-bottom: 20px;
        text-shadow: 0 2px 4px rgba(212, 101, 27, 0.3);
    }
    
    /* Loading state styling */
    .loading-container, .lazy-loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 300px;
        gap: 20px;
    }
    
    .loading-spinner, .lazy-loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid rgba(52, 152, 219, 0.2);
        border-left: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    .lazy-loading-spinner {
        width: 30px;
        height: 30px;
        border-width: 3px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .loading-text, .lazy-loading-text {
        color: var(--text-light);
        font-size: 16px;
        font-weight: 500;
        text-align: center;
        opacity: 0.8;
    }
    
    .lazy-loading-text {
        font-size: 14px;
    }
    
    /* Progress bar for initial loading */
    .loading-progress {
        width: 200px;
        height: 4px;
        background: rgba(52, 152, 219, 0.2);
        border-radius: 2px;
        overflow: hidden;
    }
    
    .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #3498db, #2980b9);
        border-radius: 2px;
        transition: width 0.5s ease;
        width: 0%;
    }
    
    .progress-bar.stage-price { width: 25%; }
    .progress-bar.stage-basic { width: 50%; }
    .progress-bar.stage-transactions { width: 75%; }
    .progress-bar.stage-complete { width: 100%; }
    
    @media (max-width: 768px) {
        .visualizer {
            padding: 15px;
        }
        
        .visualizer h2 {
            font-size: 24px;
            margin-bottom: 20px;
        }
        
        .visualizer.hex-mode,
        .visualizer.pack-mode,
        .visualizer.ball-mode {
            min-height: 500px;
        }
        
        .loading-container, .lazy-loading-container {
            min-height: 200px;
        }
        
        .loading-spinner, .lazy-loading-spinner {
            width: 40px;
            height: 40px;
        }
        
        .loading-text, .lazy-loading-text {
            font-size: 14px;
        }
        
        .loading-progress {
            width: 150px;
        }
        
        .api-status-notification {
            left: 10px;
            right: 10px;
            max-width: none;
            font-size: 13px;
        }
    }
    
    @media (max-width: 480px) {
        .visualizer {
            padding: 10px;
        }
        
        .visualizer h2 {
            font-size: 20px;
            margin-bottom: 15px;
        }
        
        .visualizer.hex-mode,
        .visualizer.pack-mode,
        .visualizer.ball-mode {
            min-height: 450px;
        }
        
        .api-status-notification {
            top: 80px;
            font-size: 12px;
            padding: 10px 15px;
        }
    }
</style>