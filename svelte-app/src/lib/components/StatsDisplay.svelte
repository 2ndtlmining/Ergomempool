<script>
    import { totalTransactions, totalValue, totalUsdValue, avgSize } from '$lib/stores.js';
    import { transactions } from '$lib/stores.js';

    // ERGO packing configuration
    const ERGO_BLOCK_CAPACITY = 2097152; // 2MB in bytes
    
    // Calculate packing stats
    $: mempoolSizeBytes = $transactions.reduce((sum, tx) => sum + (tx.size || 0), 0);
    $: utilization = Math.min((mempoolSizeBytes / ERGO_BLOCK_CAPACITY) * 100, 100);
    
    // Simple packing calculation (how many transactions fit in a block)
    $: packedTransactions = (() => {
        let currentBlockUsage = 0;
        let packedCount = 0;
        
        for (const tx of $transactions) {
            const txSize = tx.size || 0;
            if (currentBlockUsage + txSize <= ERGO_BLOCK_CAPACITY) {
                currentBlockUsage += txSize;
                packedCount++;
            } else {
                break;
            }
        }
        return packedCount;
    })();
    
    // Calculate packing efficiency
    $: packingEfficiency = packedTransactions > 0 ? 
        (($transactions.slice(0, packedTransactions).reduce((sum, tx) => sum + (tx.size || 0), 0)) / ERGO_BLOCK_CAPACITY) * 100 : 0;
    
    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
</script>

<div class="stats-and-packing-container">
    <!-- Main Mempool Stats -->
    <div class="stats">
        <div class="stat-item">
            <div class="stat-value">{$totalTransactions}</div>
            <div>Total Transactions</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">{$totalValue.toFixed(2)}</div>
            <div>Total Value (ERG)</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${$totalUsdValue.toFixed(2)}</div>
            <div>Total Value (USD)</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">{$avgSize}</div>
            <div>Avg Size (bytes)</div>
        </div>
        
        <!-- Integrated Packing Stats -->
        <div class="stat-item">
            <div class="stat-value">{formatBytes(ERGO_BLOCK_CAPACITY)}</div>
            <div>Block Capacity</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">{formatBytes(mempoolSizeBytes)}</div>
            <div>Mempool Size</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">{packedTransactions}</div>
            <div>Packed</div>
        </div>
        <div class="stat-item">
            <div class="stat-value ergo-packing-percentage">{utilization.toFixed(1)}%</div>
            <div>Utilization</div>
        </div>
    </div>
</div>

<style>
    .stats-and-packing-container {
        width: 100%;
        max-width: 900px;
    } 

    .ergo-packing-percentage {
        color: #f39c12 !important;
    }
</style>