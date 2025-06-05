import { writable, derived } from 'svelte/store';

// Core data stores
export const transactions = writable([]);
export const currentPrice = writable(0);
// Removed colorMode - Grid mode always uses value-based coloring and size-based squares

// Wallet state
export const walletConnector = writable({
    isConnected: false,
    connectedAddress: null,
    connectedWallet: null
});

// Block data
export const blockData = writable([]);

// Color palettes (from your main.js)
export const sizeColors = [
    '#27ae60', '#2ecc71', '#f1c40f', '#e67e22', '#e74c3c', '#8e44ad'
];

export const valueColors = [
    '#3498db', '#2980b9', '#9b59b6', '#8e44ad', '#e74c3c', '#c0392b'
];

// Derived stores for computed values
export const totalTransactions = derived(
    transactions, 
    $transactions => $transactions.length
);

export const totalValue = derived(
    transactions, 
    $transactions => $transactions.reduce((sum, tx) => sum + (tx.value || 0), 0)
);

export const totalUsdValue = derived(
    [transactions, currentPrice], 
    ([$transactions, $currentPrice]) => 
        $transactions.reduce((sum, tx) => sum + (tx.usd_value || 0), 0)
);

export const avgSize = derived(
    transactions, 
    $transactions => $transactions.length > 0 
        ? Math.round($transactions.reduce((sum, tx) => sum + (tx.size || 0), 0) / $transactions.length)
        : 0
);