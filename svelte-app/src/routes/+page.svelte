<!-- ENHANCED +page.svelte with Optimized Space Utilization -->

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
        console.log('🚀 Ergomempool SvelteKit app initialized - ENHANCED LAYOUT');
        
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
    
    <!-- ENHANCED MAIN CONTENT LAYOUT WITH BETTER SPACE UTILIZATION -->
    <main class="main-content" 
          class:hex-mode={currentMode === 'hex'} 
          class:pack-mode={currentMode === 'pack'} 
          class:ball-mode={currentMode === 'ball'}
          class:grid-mode={currentMode === 'grid'}>
        
        {#if coreDataLoaded}
            <!-- Enhanced Packing/Visualization Area (Main Content) -->
            <section class="packing-area">
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
            </section>
            
            <!-- Enhanced Right Sidebar: Stats + Platform Activity -->
            <aside class="sidebar">
                <!-- Stats Section -->
                <section class="stats-section">
                    <StatsDisplay 
                        packingStats={currentPackingStats} 
                        {currentMode}
                        onAddTestTransactions={handleAddTestTransactions}
                    />
                </section>
                
                <!-- Platform Activity Section -->
                <section class="platform-section">
                    <OriginActivityPanel />
                </section>
            </aside>
        {:else}
            <!-- Initial loading state spanning full width -->
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
    
    /* FIXED: Main content layout to eliminate blue area and center properly */
    .main-content {
        flex: 1;
        background: linear-gradient(135deg, var(--dark-bg) 0%, var(--darker-bg) 100%);
        padding: 20px;
        border-top: 1px solid var(--border-color);
        
        /* FIXED: Enhanced Responsive Grid Layout */
        display: grid;
        gap: 20px;
        align-items: start;
        transition: all 0.3s ease;
        min-width: 0;
        
        /* FIXED: Remove overflow hidden that was causing issues */
        overflow: visible;
        
        /* Dynamic grid template based on screen size */
        grid-template-areas: "packing sidebar";
        grid-template-columns: 1fr 320px;
        
        /* FIXED: Remove problematic margins and ensure proper container behavior */
        margin: 0;
        width: 100%;
        box-sizing: border-box;
    }
    
    /* FIXED: Enhanced Packing Area with proper centering */
    .packing-area {
        grid-area: packing;
        background: transparent;
        padding: 0;
        min-height: 500px;
        transition: all 0.3s ease;
        position: relative;
        
        /* FIXED: Proper width handling */
        width: 100%;
        max-width: 100%;
        
        /* FIXED: Better centering approach */
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        
        /* FIXED: Ensure no overflow issues */
        overflow: visible;
    }
    
    /* FIXED: Enhanced Sidebar with consistent behavior */
    .sidebar {
        grid-area: sidebar;
        display: flex;
        flex-direction: column;
        gap: 20px;
        height: fit-content;
        position: sticky;
        top: 20px;
        
        /* FIXED: Consistent width without conflicts */
        width: 320px;
        min-width: 320px;
        max-width: 320px;
        
        /* FIXED: Remove problematic padding */
        padding: 0;
        box-sizing: border-box;
    }
    
    /* Ensure both stats and platform sections have consistent styling */
    .stats-section, .platform-section {
        width: 100%;
        box-sizing: border-box;
    }
    
    /* Mode-specific heights */
    .main-content.hex-mode .packing-area {
        min-height: 600px;
    }
    
    .main-content.pack-mode .packing-area {
        min-height: 600px;
    }
    
    .main-content.ball-mode .packing-area {
        min-height: 650px;
    }
    
    /* Loading state styling spanning full width */
    .loading-container {
        grid-column: 1 / -1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        gap: 20px;
    }
    
    .lazy-loading-container {
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
    
    /* ENHANCED RESPONSIVE BREAKPOINTS FOR BETTER SPACE UTILIZATION */
    
    /* Ultra-wide screens: Better space utilization */
    @media (min-width: 1600px) {
        .main-content {
            grid-template-columns: 1fr 380px;
            gap: 30px;
            max-width: 1400px; /* FIXED: Constrain total width */
            margin: 0 auto; /* FIXED: Center the entire layout */
            padding: 30px;
        }
        
        .sidebar {
            width: 380px;
            min-width: 380px;
            max-width: 380px;
            gap: 25px;
        }
        
        /* FIXED: Ensure packing area centers its content */
        .packing-area {
            max-width: 1000px;
            margin: 0 auto;
        }
    }
    
    /* Very wide screens: Enhanced layout */
    @media (min-width: 1400px) and (max-width: 1599px) {
        .main-content {
            grid-template-columns: 1fr 350px;
            gap: 25px;
            max-width: 1300px; /* FIXED: Constrain width */
            margin: 0 auto; /* FIXED: Center layout */
        }
        
        .sidebar {
            width: 350px;
            min-width: 350px;
            max-width: 350px;
            gap: 22px;
        }
        
        .packing-area {
            max-width: 950px;
            margin: 0 auto;
        }
    }
    
    /* Large screens: Standard enhanced layout */
    @media (max-width: 1399px) and (min-width: 1200px) {
        .main-content {
            grid-template-columns: 1fr 320px;
            gap: 22px;
            max-width: 1200px; /* FIXED: Prevent stretching */
            margin: 0 auto;
        }
        
        .sidebar {
            gap: 20px;
        }
    }
    
    /* Medium-large screens */
    @media (max-width: 1199px) and (min-width: 1100px) {
        .main-content {
            grid-template-columns: 1fr 300px;
            gap: 18px;
            padding: 20px;
        }
        
        .sidebar {
            width: 300px;
            min-width: 300px;
            max-width: 300px;
            gap: 18px;
        }
    }
    
    /* Medium screens */
    @media (max-width: 1099px) and (min-width: 950px) {
        .main-content {
            grid-template-columns: 1fr 280px;
            gap: 15px;
            padding: 15px;
        }
        
        .sidebar {
            width: 280px;
            min-width: 280px;
            max-width: 280px;
            gap: 15px;
        }
    }
    
    /* Stack layout: Mobile/Tablet */
    @media (max-width: 949px) {
        .main-content {
            grid-template-columns: 1fr;
            grid-template-areas: 
                "packing"
                "sidebar";
            gap: 20px;
            padding: 15px;
            margin: 0;
            max-width: none;
        }
        
        .sidebar {
            position: static;
            gap: 20px;
            width: 100%;
            min-width: auto;
            max-width: none;
        }
        
        .packing-area {
            min-height: 450px;
            max-width: 100%;
            align-items: stretch;
        }
        
        .main-content.hex-mode .packing-area,
        .main-content.pack-mode .packing-area,
        .main-content.ball-mode .packing-area {
            min-height: 450px;
        }
    }
    
    /* Very wide screens: Enhanced layout */
    @media (min-width: 1400px) and (max-width: 1599px) {
        .main-content {
            grid-template-columns: 1fr 350px;
            gap: 25px;
        }
        
        .sidebar {
            width: 350px;
            min-width: 350px;
            max-width: 350px;
            gap: 22px;
        }
        
        .packing-area {
            max-width: 1000px;
        }
    }
    
    /* Large screens: Standard enhanced layout */
    @media (max-width: 1399px) and (min-width: 1200px) {
        .main-content {
            grid-template-columns: 1fr 320px;
            gap: 22px;
        }
        
        .sidebar {
            gap: 20px;
        }
    }
    
    /* Medium-large screens: Compact but not cramped */
    @media (max-width: 1199px) and (min-width: 1100px) {
        .main-content {
            grid-template-columns: 1fr 300px;
            gap: 18px;
        }
        
        .sidebar {
            width: 300px;
            min-width: 300px;
            max-width: 300px;
            gap: 18px;
        }
    }
    
    /* Medium screens: Balanced layout */
    @media (max-width: 1099px) and (min-width: 950px) {
        .main-content {
            grid-template-columns: 1fr 280px;
            gap: 15px;
            padding: 15px;
            padding-right: 10px;
        }
        
        .sidebar {
            width: 280px;
            min-width: 280px;
            max-width: 280px;
            gap: 15px;
            padding: 0 6px;
        }
    }
    
    /* Stack layout: Below 950px - Mobile/Tablet */
    @media (max-width: 949px) {
        .main-content {
            grid-template-columns: 1fr;
            grid-template-areas: 
                "packing"
                "sidebar";
            gap: 20px;
            padding: 15px;
            margin-right: 0;
            padding-right: 15px;
        }
        
        .sidebar {
            position: static;
            gap: 20px; /* Maintain consistent gap on mobile */
            width: 100%;
            min-width: auto;
            max-width: none;
            padding: 0;
        }
        
        .packing-area {
            min-height: 450px;
            max-width: 100%;
            align-items: stretch; /* Full width on mobile */
        }
        
        .main-content.hex-mode .packing-area,
        .main-content.pack-mode .packing-area,
        .main-content.ball-mode .packing-area {
            min-height: 450px;
        }
    }
    
    @media (max-width: 768px) {
        .main-content {
            gap: 18px;
            padding: 15px;
        }
        
        .sidebar {
            gap: 18px;
        }
        
        .packing-area {
            min-height: 400px;
        }
        
        .main-content.hex-mode .packing-area,
        .main-content.pack-mode .packing-area,
        .main-content.ball-mode .packing-area {
            min-height: 400px;
        }
        
        .loading-container, .lazy-loading-container {
            min-height: 300px;
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
        .main-content {
            padding: 10px;
            gap: 15px;
        }
        
        .sidebar {
            gap: 15px;
        }
        
        .packing-area {
            min-height: 350px;
        }
        
        .main-content.hex-mode .packing-area,
        .main-content.pack-mode .packing-area,
        .main-content.ball-mode .packing-area {
            min-height: 350px;
        }
        
        .api-status-notification {
            top: 80px;
            font-size: 12px;
            padding: 10px 15px;
        }
    }
    
    /* ENHANCED PACKING AREA CONTENT CONSTRAINTS */
    
    /* For very wide screens, we can constrain the inner content */
    .packing-area > * {
        width: 100%;
        max-width: 100%;
    }
    
    /* Special handling for transaction packing grid on wide screens */
    @media (min-width: 1400px) {
        .packing-area :global(.transaction-packing-container),
        .packing-area :global(.ball-physics-container),
        .packing-area :global(.ergo-packing-container) {
            max-width: 1000px;
            margin: 0 auto;
        }
    }
</style>