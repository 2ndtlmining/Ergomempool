// ENHANCED src/lib/stores.js - Added Origin Statistics and Data
import { writable, derived } from 'svelte/store';
import { getOriginStats, getTopPlatforms } from './transactionOrigins.js';

// Core data stores (replacing your global variables)
export const transactions = writable([]);
export const currentPrice = writable(0);
export const colorMode = writable('size');

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

// NEW: Enhanced derived stores for transaction origins
export const transactionOrigins = derived(
    [transactions, walletConnector],
    ([$transactions, $walletConnector]) => {
        console.log(`📊 Computing origin statistics for ${$transactions.length} transactions`);
        
        // Get origin statistics
        const stats = getOriginStats($transactions);
        
        // Filter out platforms with 0 transactions for cleaner display
        const activeStats = Object.entries(stats)
            .filter(([_, data]) => data.count > 0)
            .reduce((acc, [platform, data]) => {
                acc[platform] = data;
                return acc;
            }, {});
        
        console.log(`📈 Active platforms detected: ${Object.keys(activeStats).length}`);
        
        return {
            all: stats,
            active: activeStats,
            total: $transactions.length
        };
    }
);

// NEW: Top platforms by transaction count
export const topPlatforms = derived(
    transactions,
    $transactions => {
        return getTopPlatforms($transactions, 6); // Top 6 platforms
    }
);

// NEW: Platform diversity metrics
export const platformDiversity = derived(
    transactionOrigins,
    $origins => {
        const activePlatforms = Object.keys($origins.active);
        const totalTx = $origins.total;
        
        if (totalTx === 0) {
            return {
                uniquePlatforms: 0,
                diversityIndex: 0,
                dominantPlatform: null,
                dominantPercentage: 0
            };
        }
        
        // Calculate Shannon diversity index for platform distribution
        let diversityIndex = 0;
        Object.values($origins.active).forEach(platformData => {
            const proportion = platformData.count / totalTx;
            if (proportion > 0) {
                diversityIndex -= proportion * Math.log2(proportion);
            }
        });
        
        // Find dominant platform
        let dominantPlatform = null;
        let dominantPercentage = 0;
        Object.entries($origins.active).forEach(([platform, data]) => {
            if (data.percentage > dominantPercentage) {
                dominantPlatform = platform;
                dominantPercentage = data.percentage;
            }
        });
        
        return {
            uniquePlatforms: activePlatforms.length,
            diversityIndex: Number(diversityIndex.toFixed(2)),
            dominantPlatform,
            dominantPercentage: Number(dominantPercentage.toFixed(1))
        };
    }
);

// NEW: Wallet-specific transaction analysis
export const walletTransactionAnalysis = derived(
    [transactions, walletConnector],
    ([$transactions, $walletConnector]) => {
        if (!$walletConnector.isConnected || !$walletConnector.connectedAddress) {
            return {
                total: 0,
                byOrigin: {},
                percentage: 0
            };
        }
        
        const walletTxs = $transactions.filter(tx => tx.isWallet);
        const walletOriginStats = getOriginStats(walletTxs);
        
        return {
            total: walletTxs.length,
            byOrigin: walletOriginStats,
            percentage: $transactions.length > 0 ? (walletTxs.length / $transactions.length) * 100 : 0
        };
    }
);

// NEW: Real-time transaction flow metrics
export const transactionFlow = derived(
    transactions,
    $transactions => {
        if ($transactions.length === 0) {
            return {
                recentTransactions: [],
                flowRate: 0,
                peakOrigin: null
            };
        }
        
        // Get recent transactions (last 10)
        const recentTransactions = $transactions
            .slice(0, 10)
            .map(tx => ({
                id: tx.id,
                origin: tx.origin,
                value: tx.value,
                size: tx.size,
                isWallet: tx.isWallet,
                timestamp: tx.timestamp
            }));
        
        // Calculate approximate flow rate (transactions per minute)
        // This is a simplified calculation based on total transactions
        const flowRate = Math.round($transactions.length / 30); // Assuming 30 min window
        
        // Find the most active origin in recent transactions
        const recentOrigins = {};
        recentTransactions.forEach(tx => {
            recentOrigins[tx.origin] = (recentOrigins[tx.origin] || 0) + 1;
        });
        
        const peakOrigin = Object.entries(recentOrigins)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || null;
        
        return {
            recentTransactions,
            flowRate,
            peakOrigin
        };
    }
);

// NEW: Network activity summary
export const networkActivity = derived(
    [totalTransactions, totalValue, totalUsdValue, platformDiversity, transactionFlow],
    ([$totalTx, $totalValue, $totalUsd, $diversity, $flow]) => {
        let activityLevel = 'Low';
        if ($totalTx > 50) activityLevel = 'High';
        else if ($totalTx > 20) activityLevel = 'Medium';
        
        let diversityLevel = 'Low';
        if ($diversity.diversityIndex > 2) diversityLevel = 'High';
        else if ($diversity.diversityIndex > 1) diversityLevel = 'Medium';
        
        return {
            level: activityLevel,
            transactions: $totalTx,
            value: $totalValue,
            usdValue: $totalUsd,
            diversity: diversityLevel,
            diversityIndex: $diversity.diversityIndex,
            flowRate: $flow.flowRate,
            dominantPlatform: $diversity.dominantPlatform
        };
    }
);