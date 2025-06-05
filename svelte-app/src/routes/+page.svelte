<!-- Updated +page.svelte with simplified mode handling -->

<script>
    import { onMount, onDestroy } from 'svelte';
    import { transactions, currentPrice, blockData } from '$lib/stores.js';
    import { fetchTransactions, fetchBlocks, fetchPrice, addUsdValues } from '$lib/api.js';
    
    // Import components
    import Header from '$lib/components/Header.svelte';
    import BlocksSection from '$lib/components/BlocksSection.svelte';
    import StatsDisplay from '$lib/components/StatsDisplay.svelte';
    import Controls from '$lib/components/Controls.svelte';
    import MempoolGrid from '$lib/components/MempoolGrid.svelte';
    import ErgoPackingGrid from '$lib/components/ErgoPackingGrid.svelte';
    import BallPhysicsGrid from '$lib/components/BallPhysicsGrid.svelte';
    import TransactionPackingGrid from '$lib/components/TransactionPackingGrid.svelte';
    import TransactionTable from '$lib/components/TransactionTable.svelte';
    import Footer from '$lib/components/Footer.svelte';
    
    // Import global styles
    import '../app.css';
    
    let intervalIds = [];
    let currentMode = 'grid'; // Default mode: 'grid', 'hex', 'pack', 'ball'
    let ergoPackingRef;
    let ballPhysicsRef;
    let transactionPackingRef;
    let controlsRef;
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
    
    // Connect controls to components when ready
    $: if (controlsRef && ballPhysicsRef) {
        controlsRef.setBallPhysicsRef(ballPhysicsRef);
    }
    
    $: if (controlsRef && ergoPackingRef) {
        controlsRef.setErgoPackingRef(ergoPackingRef);
    }
    
    $: if (controlsRef && transactionPackingRef) {
        controlsRef.setTransactionPackingRef(transactionPackingRef);
    }
    
    // Enhanced debug logging
    $: {
        console.log('🎯 Main page state changed:', {
            currentMode,
            willShow: getDisplayModeName(currentMode)
        });
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
    
    onMount(() => {
        console.log('🚀 Ergomempool SvelteKit app initialized');
        loadAllData();
        
        const transactionInterval = setInterval(loadTransactions, 30000);
        const priceInterval = setInterval(loadPrice, 300000);
        const blockInterval = setInterval(loadBlocks, 30000);
        
        intervalIds = [transactionInterval, priceInterval, blockInterval];
        
        console.log('⏰ Auto-refresh intervals set up');
    });
    
    onDestroy(() => {
        intervalIds.forEach(id => clearInterval(id));
        console.log('🧹 Cleaned up intervals');
    });
    
    async function loadAllData() {
        console.log('📡 Loading all data...');
        try {
            await Promise.all([
                loadTransactions(),
                loadPrice(),
                loadBlocks()
            ]);
            console.log('✅ All data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading data:', error);
        }
    }
    
    async function loadTransactions() {
        try {
            const txData = await fetchTransactions();
            const priceData = await fetchPrice();
            const txWithUsd = addUsdValues(txData, priceData.price);
            
            transactions.set(txWithUsd);
            console.log(`📊 Loaded ${txWithUsd.length} transactions`);
        } catch (error) {
            console.error('❌ Error loading transactions:', error);
        }
    }
    
    async function loadPrice() {
        try {
            const priceData = await fetchPrice();
            currentPrice.set(priceData.price);
            console.log(`💰 Current ERG price: $${priceData.price}`);
        } catch (error) {
            console.error('❌ Error loading price:', error);
        }
    }
    
    async function loadBlocks() {
        try {
            const blocks = await fetchBlocks();
            blockData.set(blocks);
            console.log(`🧱 Loaded ${blocks.length} blocks`);
        } catch (error) {
            console.error('❌ Error loading blocks:', error);
        }
    }
    
    function handleRefresh() {
        console.log('🔄 Manual refresh triggered');
        loadAllData();
        
        const refreshButton = document.querySelector('.control-button.refresh-button');
        if (refreshButton) {
            const originalText = refreshButton.textContent;
            refreshButton.textContent = 'Refreshing...';
            refreshButton.disabled = true;
            
            setTimeout(() => {
                refreshButton.textContent = originalText;
                refreshButton.disabled = false;
            }, 1000);
        }
    }
    
    // Handle mode changes from Controls component
    function handlePack(isHexPacking) {
        console.log('📦 Handle pack called with:', isHexPacking);
        
        if (isHexPacking) {
            // Switch to hex packing mode
            currentMode = 'hex';
            console.log('📦 Switching to Hexagon packing mode');
            
            // Start packing animation after component loads
            setTimeout(() => {
                if (ergoPackingRef && ergoPackingRef.startPackingAnimation) {
                    console.log('🎬 Starting hexagon packing animation');
                    ergoPackingRef.startPackingAnimation();
                } else {
                    console.log('⚠️ Hexagon packing component not ready yet, retrying...');
                    
                    setTimeout(() => {
                        if (ergoPackingRef && ergoPackingRef.startPackingAnimation) {
                            console.log('🎬 Starting hexagon packing animation (retry)');
                            ergoPackingRef.startPackingAnimation();
                        } else {
                            console.log('❌ Failed to start hexagon packing animation');
                        }
                    }, 1000);
                }
            }, 500);
        } else {
            // If not hex packing, get current mode from Controls
            if (controlsRef && controlsRef.getCurrentMode) {
                currentMode = controlsRef.getCurrentMode();
                console.log('🎯 Updated mode from Controls:', currentMode);
            } else {
                // Fallback to grid mode
                currentMode = 'grid';
                console.log('📊 Fallback to grid mode');
            }
        }
    }
    
    // Watch for mode changes from Controls component
    function handleModeChange() {
        if (controlsRef && controlsRef.getCurrentMode) {
            const newMode = controlsRef.getCurrentMode();
            if (newMode !== currentMode) {
                console.log(`🔄 Mode change detected: ${currentMode} → ${newMode}`);
                currentMode = newMode;
            }
        }
    }
    
    // Poll for mode changes (since we don't have direct communication)
    let modeCheckInterval;
    onMount(() => {
        modeCheckInterval = setInterval(handleModeChange, 500);
    });
    
    onDestroy(() => {
        if (modeCheckInterval) {
            clearInterval(modeCheckInterval);
        }
    });
</script>

<svelte:head>
    <title>Ergomempool</title>
    <meta name="description" content="Real-time Ergo blockchain mempool visualizer with transaction packing simulation">
    <meta name="keywords" content="Ergo, blockchain, mempool, visualization, cryptocurrency">
</svelte:head>

<div class="container">
    <Header />
    <BlocksSection />
    
    <main class="visualizer" 
          class:hex-mode={currentMode === 'hex'} 
          class:pack-mode={currentMode === 'pack'} 
          class:ball-mode={currentMode === 'ball'}
          class:grid-mode={currentMode === 'grid'}>
        <h2>Mempool Visualizer</h2>
        
        <StatsDisplay packingStats={currentPackingStats} />
        
        <Controls 
            bind:this={controlsRef}
            onRefresh={handleRefresh} 
            onPack={handlePack} 
        />
        
        <!-- Priority-based conditional rendering -->
        {#if currentMode === 'hex'}
            <!-- Hexagon Packing Mode -->
            <ErgoPackingGrid 
                bind:this={ergoPackingRef}
                packingStats={currentPackingStats} 
            />
        {:else if currentMode === 'ball'}
            <!-- Ball Physics Mode -->
            <BallPhysicsGrid 
                bind:this={ballPhysicsRef}
                packingStats={currentPackingStats} 
            />
        {:else if currentMode === 'pack'}
            <!-- Transaction Packing Mode -->
            <TransactionPackingGrid 
                bind:this={transactionPackingRef}
                bind:packingStats={currentPackingStats}
            />
        {:else}
            <!-- Default Grid Mode -->
            <MempoolGrid />
        {/if}
    </main>
    
    <TransactionTable />
    <Footer />
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background: linear-gradient(135deg, var(--darker-bg) 0%, var(--dark-bg) 100%);
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
    
    /* Grid mode (default) */
    .visualizer.grid-mode {
        background: linear-gradient(135deg, var(--dark-bg) 0%, var(--darker-bg) 100%);
    }
    
    .visualizer.grid-mode h2 {
        color: var(--primary-orange);
    }
    
    /* Hexagon Packing mode */
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
    
    /* Transaction Packing mode */
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
    
    /* Ball Physics mode */
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
    }
</style>