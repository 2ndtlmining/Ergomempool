<script>
    import { transactions } from '$lib/stores.js';
    
    function shortenTransactionId(id, startChars = 5, endChars = 5) {
        if (!id || id.length <= startChars + endChars + 3) {
            return id;
        }
        return `${id.substring(0, startChars)}...${id.substring(id.length - endChars)}`;
    }
    
    $: displayTransactions = $transactions.slice(0, 20);
</script>

<section class="transactions">
    <h2>Recent Transactions</h2>
    <table id="transaction-table">
        <thead>
            <tr>
                <th>ID</th>
                <th>Size (bytes)</th>
                <th>Value (ERG)</th>
                <th>Value ($)</th>
            </tr>
        </thead>
        <tbody>
            {#if displayTransactions.length === 0}
                <tr><td colspan="4" class="loading">Loading...</td></tr>
            {:else}
                {#each displayTransactions as tx}
                    <tr>
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