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
    import TransactionTable from '$lib/components/TransactionTable.svelte';
    import Footer from '$lib/components/Footer.svelte';
    
    // Import global styles
    import '../app.css';
    
    let intervalIds = [];
    let packingMode = false;
    let ergoPackingRef;
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
    
    // Keep console debug for development
    $: {
        console.log('🎯 Main page packingMode changed to:', packingMode);
    }
    
    onMount(() => {
        console.log('🚀 Ergomempool SvelteKit app initialized');
        loadAllData();
        
        // Set up auto-refresh intervals matching your Flask app
        const transactionInterval = setInterval(loadTransactions, 30000); // 30 seconds
        const priceInterval = setInterval(loadPrice, 300000); // 5 minutes
        const blockInterval = setInterval(loadBlocks, 30000); // 30 seconds
        
        intervalIds = [transactionInterval, priceInterval, blockInterval];
        
        console.log('⏰ Auto-refresh intervals set up');
    });
    
    onDestroy(() => {
        // Clean up intervals on component destruction
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
            
            // Add USD values to each transaction (matching Flask logic)
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
        
        // Visual feedback for user
        const refreshButton = document.querySelector('.control-button:last-child');
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
    
    function handlePack(isPacking) {
        console.log('📦 Pack mode toggle:', isPacking);
        packingMode = isPacking;
        
        if (isPacking) {
            console.log('📦 Switching to ERGO packing visualization');
            
            // Start packing animation after component loads
            setTimeout(() => {
                if (ergoPackingRef && ergoPackingRef.startPackingAnimation) {
                    console.log('🎬 Starting packing animation');
                    ergoPackingRef.startPackingAnimation();
                } else {
                    console.log('⚠️ Packing component not ready yet, retrying...');
                    
                    // Retry after a longer delay
                    setTimeout(() => {
                        if (ergoPackingRef && ergoPackingRef.startPackingAnimation) {
                            console.log('🎬 Starting packing animation (retry)');
                            ergoPackingRef.startPackingAnimation();
                        } else {
                            console.log('❌ Failed to start packing animation');
                        }
                    }, 1000);
                }
            }, 500);
        } else {
            console.log('📊 Switching to standard grid visualization');
        }
    }
</script>

<svelte:head>
    <title>Ergomempool</title>
    <meta name="description" content="Real-time Ergo blockchain mempool visualizer with transaction packing simulation">
    <meta name="keywords" content="Ergo, blockchain, mempool, visualization, cryptocurrency">
</svelte:head>

<div class="container">
    <!-- Header with wallet connection and test transaction -->
    <Header />
    
    <!-- Blocks section showing next block and last 4 blocks -->
    <BlocksSection />
    
    <!-- Main visualization area -->
    <main class="visualizer" class:packing-mode={packingMode}>
        <h2>Mempool Visualizer</h2>
        
        <!-- Stats display with ERGO packing information -->
        <StatsDisplay packingStats={currentPackingStats} />
        
        <!-- Control buttons for color mode, packing, and refresh -->
        <Controls onRefresh={handleRefresh} onPack={handlePack} />
        
        <!-- Conditional rendering: Packing visualization or standard grid -->
        {#if packingMode}
            <ErgoPackingGrid 
                bind:this={ergoPackingRef} 
                bind:packingStats={currentPackingStats} 
            />
        {:else}
            <MempoolGrid />
        {/if}
    </main>
    
    <!-- Recent transactions table -->
    <TransactionTable />
    
    <!-- Footer with GitHub, presentation, and donation links -->
    <Footer />
</div>

<style>
    /* Global container styles */
    .container {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background: linear-gradient(135deg, var(--darker-bg) 0%, var(--dark-bg) 100%);
    }
    
    /* Main visualizer area */
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
    }
    
    .visualizer h2 {
        margin-top: 0;
        margin-bottom: 25px;
        color: var(--primary-orange);
        font-size: 28px;
        text-shadow: 0 2px 4px rgba(230, 126, 34, 0.3);
        text-align: center;
    }
    
    /* Packing mode specific styling */
    .visualizer.packing-mode {
        min-height: 600px;
        background: linear-gradient(135deg, var(--dark-bg) 0%, var(--darker-bg) 100%);
    }
    
    .visualizer.packing-mode h2 {
        color: var(--primary-orange);
        font-size: 28px;
        text-align: center;
        margin-bottom: 20px;
    }
    
    /* Responsive design for mobile */
    @media (max-width: 768px) {
        .visualizer {
            padding: 15px;
        }
        
        .visualizer h2 {
            font-size: 24px;
            margin-bottom: 20px;
        }
        
        .visualizer.packing-mode {
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
        
        .visualizer.packing-mode {
            min-height: 450px;
        }
    }
</style>