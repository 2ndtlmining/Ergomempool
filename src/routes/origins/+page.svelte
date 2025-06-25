<!-- UPDATED src/routes/origins/+page.svelte - Integrated with existing theme -->
<script>
  import { onMount } from 'svelte';
  import { transactions, currentPrice, walletConnector } from '$lib/stores.js';
  import { fetchTransactions, fetchPrice, addUsdValues } from '$lib/api.js';
  import TransactionOriginNetwork from '$lib/components/TransactionOriginNetwork.svelte';
  import { processTransactionForOrigins, getOriginStats } from '$lib/transactionOrigins.js';
  
  // Import existing components
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import BlocksSection from '$lib/components/BlocksSection.svelte';
  
  // Import global styles
  import '../../app.css';
  
  let processedTransactions = [];
  let pageLoaded = false;
  let originStats = {};
  let isLoading = true;
  let loadingError = null;
  let loadingProgress = 'Initializing...';
  let showDebugInfo = false;
  
  // Process transactions when they change
  $: if ($transactions.length > 0 && pageLoaded) {
    console.log(`🔄 Processing ${$transactions.length} transactions for enhanced origins visualization...`);
    
    processedTransactions = $transactions.map(tx => 
      processTransactionForOrigins(tx, $walletConnector.connectedAddress)
    );
    
    // Get statistics
    originStats = getOriginStats(processedTransactions);
    
    console.log(`✅ Processed ${processedTransactions.length} transactions for interactive network view`);
    console.log('📊 Enhanced origin breakdown:', originStats);
    
    isLoading = false;
  }
  
  onMount(async () => {
    pageLoaded = true;
    console.log('🌐 Enhanced Transaction Origins page loaded');
    
    await loadTransactionData();
  });
  
  async function loadTransactionData() {
    try {
      isLoading = true;
      loadingError = null;
      
      // Step 1: Fetch current price
      loadingProgress = 'Fetching current ERG price...';
      console.log('💰 Fetching price data...');
      
      const priceData = await fetchPrice();
      currentPrice.set(priceData.price || 1.0);
      console.log(`💰 Price loaded: $${priceData.price} from ${priceData.source}`);
      
      // Step 2: Fetch transactions
      loadingProgress = 'Fetching mempool transactions...';
      console.log('📦 Fetching transaction data...');
      
      const rawTransactions = await fetchTransactions();
      console.log(`📦 Fetched ${rawTransactions.length} raw transactions`);
      
      // Step 3: Add USD values
      loadingProgress = 'Processing transaction values...';
      const transactionsWithUsd = addUsdValues(rawTransactions, priceData.price || 1.0);
      console.log(`💵 Added USD values to ${transactionsWithUsd.length} transactions`);
      
      // Step 4: Update store (this will trigger the reactive statement above)
      loadingProgress = 'Analyzing transaction origins and initializing network...';
      transactions.set(transactionsWithUsd);
      
      console.log('✅ Transaction data loaded successfully for interactive network');
      
    } catch (error) {
      console.error('❌ Failed to load transaction data:', error);
      loadingError = error.message;
      isLoading = false;
      
      // Enhanced error handling
      if (error.isNetworkError) {
        loadingError = 'Network connection failed. Please check your internet connection.';
      } else if (error.isServerError) {
        loadingError = `Server error (${error.status}): ${error.message}`;
      } else {
        loadingError = error.message || 'Unknown error occurred';
      }
    }
  }
  
  async function retryLoading() {
    console.log('🔄 Retrying data load for network visualization...');
    await loadTransactionData();
  }
  
  function formatNumber(num) {
    return num?.toLocaleString() || 0;
  }
  
  function formatPercentage(num) {
    return num?.toFixed(1) || 0;
  }
  
  function toggleDebugInfo() {
    showDebugInfo = !showDebugInfo;
  }
  
  // Calculate enhanced statistics
  $: totalVolume = Object.values(originStats).reduce((sum, stat) => sum + (stat.volume || 0), 0);
  $: activePlatformsCount = Object.values(originStats).filter(stat => stat.count > 0).length;
  $: walletTransactions = processedTransactions.filter(tx => tx.isWallet);
  $: averageTransactionValue = processedTransactions.length > 0 ? 
    processedTransactions.reduce((sum, tx) => sum + (tx.value || 0), 0) / processedTransactions.length : 0;
</script>

<svelte:head>
  <title>Interactive Transaction Origins - Ergomempool</title>
  <meta name="description" content="Interactive network visualization of Ergo mempool transaction origins">
</svelte:head>

<div class="container">
  <!-- Use existing Header component -->
  <Header />
  
  <!-- Use existing BlocksSection component -->
  <BlocksSection />
  
  <!-- Main content area matching existing app structure -->
  <main class="visualizer origins-mode">
    <h2>🌐 Transaction Origins Network</h2>
    
    <!-- Loading State -->
    {#if isLoading}
      <div class="loading-container">
        <div class="loading-content">
          <div class="loading-spinner">📦</div>
          <h3>Initializing Interactive Network</h3>
          <p class="loading-progress">{loadingProgress}</p>
          <div class="loading-steps">
            <div class="step completed">1. Fetch price data ✓</div>
            <div class="step completed">2. Fetch mempool transactions ✓</div>
            <div class="step active">3. Process USD values ⏳</div>
            <div class="step">4. Initialize network visualization</div>
          </div>
          <div class="loading-info">
            <p>🌐 Preparing interactive transaction network visualization</p>
            <p>📊 Processing origin detection algorithms</p>
            <p>🎨 Loading platform configurations</p>
          </div>
        </div>
      </div>
    
    <!-- Error State -->
    {:else if loadingError}
      <div class="error-state">
        <div class="error-content">
          <div class="error-icon">❌</div>
          <h3>Network Initialization Failed</h3>
          <p class="error-message">{loadingError}</p>
          <div class="error-actions">
            <button class="control-button" on:click={retryLoading}>
              🔄 Retry Network Setup
            </button>
            <button class="control-button" on:click={toggleDebugInfo}>
              🔍 Show Debug Info
            </button>
          </div>
          
          {#if showDebugInfo}
            <div class="debug-info">
              <h4>🔧 Debug Information:</h4>
              <ul>
                <li>Transactions loaded: {$transactions.length}</li>
                <li>Current price: ${$currentPrice}</li>
                <li>Wallet connected: {$walletConnector.connectedAddress ? 'Yes' : 'No'}</li>
                <li>Page loaded: {pageLoaded ? 'Yes' : 'No'}</li>
                <li>Network container ready: {processedTransactions.length > 0 ? 'Yes' : 'No'}</li>
              </ul>
            </div>
          {/if}
          
          <div class="troubleshooting">
            <h4>💡 Troubleshooting Steps:</h4>
            <ul>
              <li>Verify API server connectivity</li>
              <li>Check browser console for detailed errors</li>
              <li>Ensure stable internet connection</li>
              <li>Try refreshing the page</li>
              <li>Clear browser cache if issues persist</li>
            </ul>
          </div>
        </div>
      </div>
    
    <!-- Success State with Quick Stats and Network -->
    {:else if processedTransactions.length > 0}
      <!-- Quick Stats Display -->
      <div class="stats">
        <div class="stat-item">
          <div class="stat-value">{formatNumber(processedTransactions.length)}</div>
          <div>Total Transactions</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{activePlatformsCount}</div>
          <div>Active Platforms</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{formatNumber(walletTransactions.length)}</div>
          <div>Your Transactions</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{totalVolume.toFixed(2)} ERG</div>
          <div>Total Volume</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${(totalVolume * $currentPrice).toFixed(2)}</div>
          <div>USD Value</div>
        </div>
      </div>
      
      <!-- Controls -->
      <div class="controls">
        <button class="control-button" on:click={retryLoading}>
          🔄 Refresh Data
        </button>
        <button class="control-button" on:click={toggleDebugInfo}>
          {showDebugInfo ? '📊 Hide Stats' : '📊 Show Stats'}
        </button>
      </div>
      
      <!-- Main Interactive Network Component -->
      <TransactionOriginNetwork />
      
      <!-- Detailed Statistics Panel (expandable) -->
      {#if showDebugInfo}
        <div class="detailed-stats">
          <div class="detailed-stats-content">
            <div class="stats-header">
              <h3>📈 Detailed Network Statistics</h3>
              <button class="close-stats" on:click={toggleDebugInfo}>✕</button>
            </div>
            
            <div class="stats-grid">
              <div class="stats-section">
                <h4>🌐 Network Overview</h4>
                <div class="stat-row">
                  <span>Total Transactions:</span>
                  <span>{formatNumber(processedTransactions.length)}</span>
                </div>
                <div class="stat-row">
                  <span>Average Value:</span>
                  <span>{averageTransactionValue.toFixed(4)} ERG</span>
                </div>
                <div class="stat-row">
                  <span>Total Volume:</span>
                  <span>{totalVolume.toFixed(4)} ERG (${(totalVolume * $currentPrice).toFixed(2)})</span>
                </div>
                <div class="stat-row">
                  <span>Active Platforms:</span>
                  <span>{activePlatformsCount} of {Object.keys(originStats).length}</span>
                </div>
              </div>
              
              <div class="stats-section">
                <h4>🎯 Platform Breakdown</h4>
                {#each Object.entries(originStats) as [platform, data]}
                  {#if data.count > 0}
                    <div class="platform-stat">
                      <div class="platform-header">
                        <span class="platform-name">{data.config?.name || platform}</span>
                        <span class="platform-percentage">{formatPercentage(data.percentage)}%</span>
                      </div>
                      <div class="platform-details">
                        <span>Transactions: {formatNumber(data.count)}</span>
                        <span>Volume: {data.volume?.toFixed(4)} ERG</span>
                      </div>
                    </div>
                  {/if}
                {/each}
              </div>
              
              <div class="stats-section">
                <h4>💰 Market Data</h4>
                <div class="stat-row">
                  <span>ERG Price:</span>
                  <span>${$currentPrice?.toFixed(4)}</span>
                </div>
                <div class="stat-row">
                  <span>Total USD Value:</span>
                  <span>${(totalVolume * $currentPrice).toFixed(2)}</span>
                </div>
                <div class="stat-row">
                  <span>Wallet Transactions:</span>
                  <span>{formatNumber(walletTransactions.length)} ({walletTransactions.length > 0 ? ((walletTransactions.length / processedTransactions.length) * 100).toFixed(1) : 0}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}
    
    <!-- No Data State -->
    {:else}
      <div class="no-data-state">
        <div class="no-data-content">
          <div class="no-data-icon">📭</div>
          <h3>No Network Data Available</h3>
          <p>The mempool appears to be empty or all transactions have been processed.</p>
          <p class="network-info">The interactive network requires active transactions to visualize.</p>
          <div class="no-data-actions">
            <button class="control-button" on:click={retryLoading}>
              🔄 Refresh Network Data
            </button>
          </div>
          
          <div class="mempool-info">
            <h4>ℹ️ About the Interactive Network:</h4>
            <p>
              This visualization shows real-time transaction flow from various platforms (DEXs, NFT markets, bridges) 
              to the Ergo mempool. Each platform is represented as a node, with animated connections showing 
              transaction movement.
            </p>
            <p>
              When transactions are available, you can:
            </p>
            <ul>
              <li>🖱️ Drag nodes to rearrange the network layout</li>
              <li>👁️ Hover over nodes to see detailed statistics</li>
              <li>⏯️ Control animation speed and flow</li>
              <li>📊 View real-time network activity</li>
            </ul>
          </div>
        </div>
      </div>
    {/if}
  </main>
  
  <!-- Use existing Footer component -->
  <Footer />
</div>

<style>
  /* Integrate with existing app theme */
  .origins-mode {
    min-height: 600px;
    background: linear-gradient(135deg, var(--dark-bg) 0%, var(--darker-bg) 100%);
  }
  
  .origins-mode h2 {
    color: var(--primary-orange);
    font-size: 28px;
    text-shadow: 0 2px 4px rgba(230, 126, 34, 0.3);
    text-align: center;
    margin-bottom: 25px;
  }
  
  /* Loading State */
  .loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
    padding: 40px 20px;
  }
  
  .loading-content {
    text-align: center;
    max-width: 500px;
    background: linear-gradient(135deg, rgba(44, 74, 107, 0.15) 0%, rgba(26, 35, 50, 0.15) 100%);
    border-radius: 12px;
    border: 2px solid var(--border-color);
    padding: 30px;
  }
  
  .loading-spinner {
    font-size: 48px;
    animation: spin 2s linear infinite;
    margin-bottom: 20px;
    display: block;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .loading-content h3 {
    color: var(--primary-orange);
    margin-bottom: 15px;
    font-size: 24px;
  }
  
  .loading-progress {
    color: var(--secondary-orange);
    font-weight: 600;
    margin-bottom: 20px;
  }
  
  .loading-steps {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 15px;
    text-align: left;
    margin-bottom: 20px;
  }
  
  .step {
    padding: 8px 0;
    color: var(--text-muted);
    font-size: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  
  .step:last-child {
    border-bottom: none;
  }
  
  .step.completed {
    color: #27ae60;
  }
  
  .step.active {
    color: var(--primary-orange);
    font-weight: 600;
  }
  
  .loading-info {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 15px;
    text-align: left;
  }
  
  .loading-info p {
    margin: 5px 0;
    font-size: 13px;
    color: var(--text-muted);
  }
  
  /* Error State */
  .error-state {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
    padding: 40px 20px;
  }
  
  .error-content {
    text-align: center;
    max-width: 600px;
    background: linear-gradient(135deg, rgba(231, 76, 60, 0.1) 0%, rgba(192, 57, 43, 0.1) 100%);
    border-radius: 12px;
    border: 2px solid rgba(231, 76, 60, 0.3);
    padding: 30px;
  }
  
  .error-icon {
    font-size: 48px;
    margin-bottom: 20px;
    display: block;
  }
  
  .error-content h3 {
    color: var(--primary-orange);
    margin-bottom: 15px;
    font-size: 24px;
  }
  
  .error-message {
    color: #e74c3c;
    background: rgba(231, 76, 60, 0.1);
    padding: 15px;
    border-radius: 8px;
    border: 1px solid #e74c3c;
    margin-bottom: 20px;
    font-family: monospace;
  }
  
  .error-actions {
    display: flex;
    gap: 15px;
    justify-content: center;
    margin-bottom: 25px;
  }
  
  .debug-info {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 15px;
    text-align: left;
    margin-bottom: 20px;
  }
  
  .debug-info h4 {
    color: var(--secondary-orange);
    margin: 0 0 10px 0;
    font-size: 16px;
  }
  
  .debug-info ul {
    margin: 0;
    padding-left: 20px;
    color: var(--text-muted);
  }
  
  .debug-info li {
    margin-bottom: 5px;
    font-size: 13px;
  }
  
  .troubleshooting {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 20px;
    text-align: left;
  }
  
  .troubleshooting h4 {
    color: var(--secondary-orange);
    margin: 0 0 15px 0;
    font-size: 16px;
  }
  
  .troubleshooting ul {
    margin: 0;
    padding-left: 20px;
    color: var(--text-muted);
  }
  
  .troubleshooting li {
    margin-bottom: 8px;
    font-size: 14px;
  }
  
  /* No Data State */
  .no-data-state {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
    padding: 40px 20px;
  }
  
  .no-data-content {
    text-align: center;
    max-width: 600px;
    background: linear-gradient(135deg, rgba(44, 74, 107, 0.1) 0%, rgba(26, 35, 50, 0.1) 100%);
    border-radius: 12px;
    border: 2px solid var(--border-color);
    padding: 30px;
  }
  
  .no-data-icon {
    font-size: 64px;
    margin-bottom: 20px;
    opacity: 0.7;
  }
  
  .no-data-content h3 {
    color: var(--primary-orange);
    margin-bottom: 15px;
    font-size: 24px;
  }
  
  .no-data-content p {
    color: var(--text-muted);
    font-size: 16px;
    line-height: 1.5;
    margin-bottom: 10px;
  }
  
  .network-info {
    color: var(--secondary-orange);
    font-weight: 600;
  }
  
  .no-data-actions {
    margin: 25px 0;
  }
  
  .mempool-info {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 20px;
    text-align: left;
  }
  
  .mempool-info h4 {
    color: var(--secondary-orange);
    margin: 0 0 15px 0;
    font-size: 16px;
  }
  
  .mempool-info p {
    color: var(--text-muted);
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 15px;
  }
  
  .mempool-info ul {
    margin: 0;
    padding-left: 20px;
    color: var(--text-muted);
  }
  
  .mempool-info li {
    margin-bottom: 8px;
    font-size: 14px;
  }
  
  /* Detailed Stats Panel */
  .detailed-stats {
    background: linear-gradient(135deg, rgba(44, 74, 107, 0.15) 0%, rgba(26, 35, 50, 0.15) 100%);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    margin-top: 25px;
    overflow: hidden;
    max-width: 900px;
    width: 100%;
  }
  
  .detailed-stats-content {
    padding: 20px;
  }
  
  .stats-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 2px solid var(--border-color);
  }
  
  .stats-header h3 {
    color: var(--primary-orange);
    margin: 0;
    font-size: 18px;
  }
  
  .close-stats {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 18px;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.3s ease;
  }
  
  .close-stats:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--primary-orange);
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
  }
  
  .stats-section {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 15px;
    border: 1px solid var(--border-color);
  }
  
  .stats-section h4 {
    color: var(--secondary-orange);
    margin: 0 0 12px 0;
    font-size: 14px;
  }
  
  .stat-row {
    display: flex;
    justify-content: space-between;
    margin: 8px 0;
    font-size: 13px;
  }
  
  .stat-row span:first-child {
    color: var(--text-muted);
  }
  
  .stat-row span:last-child {
    color: var(--text-light);
    font-weight: 600;
    font-family: 'Courier New', monospace;
  }
  
  .platform-stat {
    margin-bottom: 12px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    border-left: 3px solid var(--primary-orange);
  }
  
  .platform-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }
  
  .platform-name {
    font-weight: 600;
    color: var(--text-light);
  }
  
  .platform-percentage {
    color: var(--primary-orange);
    font-weight: bold;
  }
  
  .platform-details {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--text-muted);
  }
  
  /* Responsive Design */
  @media (max-width: 768px) {
    .origins-mode h2 {
      font-size: 24px;
    }
    
    .stats-grid {
      grid-template-columns: 1fr;
      gap: 15px;
    }
    
    .error-actions {
      flex-direction: column;
      align-items: center;
    }
    
    .loading-content,
    .error-content,
    .no-data-content {
      padding: 20px;
    }
  }
  
  @media (max-width: 480px) {
    .origins-mode h2 {
      font-size: 20px;
    }
    
    .loading-spinner {
      font-size: 36px;
    }
    
    .error-icon,
    .no-data-icon {
      font-size: 48px;
    }
  }
</style>