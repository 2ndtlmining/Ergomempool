<script>
    import { transactions } from '$lib/stores.js';
    import { PLATFORM_CONFIGS } from '$lib/transactionOrigins.js';
    
    function shortenTransactionId(id, startChars = 5, endChars = 5) {
        if (!id || id.length <= startChars + endChars + 3) {
            return id;
        }
        return `${id.substring(0, startChars)}...${id.substring(id.length - endChars)}`;
    }
    
    function getOriginConfig(transaction) {
        const origin = transaction.origin || 'P2P';
        return PLATFORM_CONFIGS[origin] || PLATFORM_CONFIGS.P2P;
    }
    
    $: displayTransactions = $transactions.slice(0, 20);
</script>

<section class="transactions">
    <h2>Recent Transactions</h2>
    <table id="transaction-table">
        <thead>
            <tr>
                <th>Type</th>
                <th>ID</th>
                <th>Size (bytes)</th>
                <th>Value (ERG)</th>
                <th>Value ($)</th>
            </tr>
        </thead>
        <tbody>
            {#if displayTransactions.length === 0}
                <tr><td colspan="5" class="loading">Loading...</td></tr>
            {:else}
                {#each displayTransactions as tx}
                    {@const originConfig = getOriginConfig(tx)}
                    <tr>
                        <td class="origin-cell">
                            <div class="origin-container">
                                <img 
                                    src={originConfig.logo} 
                                    alt={originConfig.name}
                                    class="origin-logo"
                                    on:error={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextElementSibling.style.display = 'flex';
                                    }}
                                />
                                <div 
                                    class="origin-fallback" 
                                    style="background-color: {originConfig.color}; display: none;"
                                >
                                    {originConfig.name.slice(0, 2).toUpperCase()}
                                </div>
                                <span class="origin-name">{originConfig.name}</span>
                            </div>
                        </td>
                        <td>
                            <a 
                                href="https://sigmaspace.io/en/transaction/{tx.id}" 
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {shortenTransactionId(tx.id)}
                            </a>
                        </td>
                        <td>{tx.size || 'N/A'}</td>
                        <td>{(tx.value || 0).toFixed(4)}</td>
                        <td>{(tx.usd_value || 0).toFixed(2)}</td>
                    </tr>
                {/each}
            {/if}
        </tbody>
    </table>
</section>

<style>
    .origin-cell {
        padding: 8px !important;
        min-width: 120px;
    }
    
    .origin-container {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .origin-logo {
        width: 24px;
        height: 24px;
        object-fit: contain;
        border-radius: 4px;
        filter: brightness(1.1);
        transition: transform 0.2s ease;
    }
    
    .origin-logo:hover {
        transform: scale(1.1);
    }
    
    .origin-fallback {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 8px;
        font-weight: bold;
        text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
    }
    
    .origin-name {
        color: var(--text-light);
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 80px;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
        .origin-name {
            display: none; /* Hide text on mobile, show only logo */
        }
        
        .origin-cell {
            min-width: 40px;
            text-align: center;
        }
        
        .origin-container {
            justify-content: center;
        }
    }
    
    @media (max-width: 480px) {
        .origin-logo, .origin-fallback {
            width: 20px;
            height: 20px;
        }
        
        .origin-fallback {
            font-size: 7px;
        }
    }
</style>