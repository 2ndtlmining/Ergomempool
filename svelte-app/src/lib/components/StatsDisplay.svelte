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

<!-- COMPACT SIDEBAR-OPTIMIZED LAYOUT -->
<div class="stats-container">
    <!-- Main Mempool Stats -->
    <div class="stats-section">
        <h3 class="stats-title">Mempool Stats</h3>
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-value">{$totalTransactions}</div>
                <div class="stat-label">Transactions</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">{$totalValue.toFixed(1)}</div>
                <div class="stat-label">Value (ERG)</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${$totalUsdValue.toFixed(0)}</div>
                <div class="stat-label">Value (USD)</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">{$avgSize}</div>
                <div class="stat-label">Avg Size (B)</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">2 MB</div>
                <div class="stat-label">Block Cap</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">{formatBytes(mempoolSizeBytes)}</div>
                <div class="stat-label">Mempool</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">{packedTransactions}</div>
                <div class="stat-label">Packed</div>
            </div>
            <div class="stat-item ergo-packing-percentage-item">
                <div class="stat-value ergo-packing-percentage">{utilization.toFixed(1)}%</div>
                <div class="stat-label">Utilization</div>
            </div>
        </div>
    </div>
</div>

<style>
    .stats-container {
        width: 100%;
        max-width: 100%;
    }

    .stats-section {
        background: linear-gradient(135deg, rgba(44, 74, 107, 0.15) 0%, rgba(26, 35, 50, 0.15) 100%);
        border: 2px solid var(--border-color);
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
    }

    .stats-section:hover {
        border-color: rgba(230, 126, 34, 0.4);
        box-shadow: 0 6px 25px rgba(230, 126, 34, 0.15);
    }

    .stats-title {
        color: var(--primary-orange);
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 12px 0;
        text-align: center;
        text-shadow: 0 1px 2px rgba(230, 126, 34, 0.3);
        position: relative;
    }

    .stats-title::after {
        content: '';
        position: absolute;
        bottom: -4px;
        left: 50%;
        transform: translateX(-50%);
        width: 30px;
        height: 2px;
        background: linear-gradient(90deg, var(--primary-orange), var(--secondary-orange));
        border-radius: 1px;
    }

    /* OPTIMIZED COMPACT GRID LAYOUT */
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }

    .stat-item {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(74, 107, 138, 0.2);
        border-radius: 8px;
        padding: 8px 6px;
        text-align: center;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        min-height: 50px;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    .stat-item::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(230, 126, 34, 0.1), transparent);
        transition: left 0.5s ease;
    }

    .stat-item:hover::before {
        left: 100%;
    }

    .stat-item:hover {
        background: rgba(230, 126, 34, 0.1);
        border-color: rgba(230, 126, 34, 0.4);
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(230, 126, 34, 0.2);
    }

    .stat-value {
        font-size: 14px;
        font-weight: bold;
        color: var(--primary-orange);
        text-shadow: 0 1px 2px rgba(230, 126, 34, 0.3);
        margin-bottom: 2px;
        position: relative;
        z-index: 2;
        line-height: 1.2;
    }

    .stat-label {
        font-size: 9px;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.3px;
        font-weight: 600;
        position: relative;
        z-index: 2;
        line-height: 1.1;
    }

    /* Special styling for percentage values */
    .ergo-packing-percentage {
        color: #f39c12 !important;
    }

    .ergo-packing-percentage-item:hover .ergo-packing-percentage {
        color: #ffb347 !important;
    }

    /* RESPONSIVE GRID ADJUSTMENTS */
    
    /* For very narrow sidebars */
    @media (max-width: 320px) {
        .stats-grid {
            grid-template-columns: 1fr;
            gap: 6px;
        }
        
        .stat-item {
            padding: 6px 4px;
            min-height: 45px;
        }
        
        .stat-value {
            font-size: 13px;
        }
        
        .stat-label {
            font-size: 8px;
        }
    }
    
    /* For medium sidebars (280-320px) */
    @media (min-width: 280px) and (max-width: 320px) {
        .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
        }
        
        .stat-item {
            padding: 7px 5px;
        }
        
        .stat-value {
            font-size: 13px;
        }
        
        .stat-label {
            font-size: 8px;
        }
    }
    
    /* For wider sidebars (320px+) */
    @media (min-width: 320px) {
        .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
        }
        
        .stat-item {
            padding: 8px 6px;
        }
    }
    
    /* For mobile stacked layout */
    @media (max-width: 949px) {
        .stats-container {
            max-width: 100%;
        }
        
        .stats-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
        }
        
        .stat-item {
            padding: 10px 8px;
            min-height: 55px;
        }
        
        .stat-value {
            font-size: 15px;
        }
        
        .stat-label {
            font-size: 10px;
        }
    }
    
    /* For small mobile screens */
    @media (max-width: 600px) {
        .stats-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
        }
    }
    
    @media (max-width: 480px) {
        .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
        }
        
        .stat-item {
            padding: 8px 6px;
            min-height: 50px;
        }
        
        .stat-value {
            font-size: 14px;
        }
        
        .stat-label {
            font-size: 9px;
        }
    }
</style>