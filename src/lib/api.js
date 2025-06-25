// ENHANCED src/lib/api.js - Integrated with Transaction Origins Detection
import axios from 'axios';
import { processTransactionsWithOrigins } from './transactionOrigins.js';

// Configure axios with relative URLs to avoid networking issues
const api = axios.create({
    baseURL: '', // Use relative URLs
    timeout: 15000, // Increased timeout
});

// ENHANCED: Centralized API calls with origin detection
export async function fetchTransactions() {
    try {
        console.log('📊 Fetching transactions with origin detection...');
        const response = await api.get('/api?endpoint=transactions');
        
        // ENHANCED: Handle new response format from server
        if (response.data.error) {
            console.error('❌ Transaction API error:', response.data);
            const error = new Error(response.data.error);
            error.serverData = response.data;
            error.isServerError = true;
            throw error;
        }
        
        // Handle both old format (direct array) and new format (with meta)
        const transactions = Array.isArray(response.data) ? response.data : response.data.data;
        
        if (response.data.meta) {
            console.log(`📊 fetchTransactions: Retrieved ${transactions.length} transactions via ${response.data.meta.source}`);
            if (response.data.meta.errors) {
                console.warn('⚠️ Transaction API had fallback issues:', response.data.meta.errors);
            }
        }
        
        // ENHANCED: Add origin detection to all transactions at API level
        console.log(`🔍 API: Processing ${transactions.length} transactions for origin detection...`);
        const transactionsWithOrigins = processTransactionsWithOrigins(transactions);
        
        // Log origin distribution for debugging
        const originCounts = transactionsWithOrigins.reduce((counts, tx) => {
            counts[tx.origin] = (counts[tx.origin] || 0) + 1;
            return counts;
        }, {});
        
        console.log(`✅ API: Origin detection complete for ${transactionsWithOrigins.length} transactions`);
        console.log(`📈 API: Origin distribution:`, originCounts);
        
        // Validate that origin detection worked
        const withoutOrigin = transactionsWithOrigins.filter(tx => !tx.origin);
        if (withoutOrigin.length > 0) {
            console.warn(`⚠️ API: ${withoutOrigin.length} transactions missing origin, defaulting to P2P`);
            withoutOrigin.forEach(tx => {
                tx.origin = 'P2P';
                tx.originConfig = { name: 'P2P Transfer', color: '#95a5a6', logo: '/logos/p2p.png' };
            });
        }
        
        return transactionsWithOrigins;
    } catch (error) {
        console.error('❌ Error fetching transactions in api.js:', error);
        
        // ENHANCED: Distinguish between network errors and API errors
        if (error.response) {
            // Server responded with error status
            const serverError = new Error(`Server error: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`);
            serverError.isServerError = true;
            serverError.status = error.response.status;
            serverError.serverData = error.response.data;
            throw serverError;
        } else if (error.request) {
            // Network error
            const networkError = new Error('Network error: Could not reach the server');
            networkError.isNetworkError = true;
            throw networkError;
        } else {
            // Other error (including server errors from above)
            throw error;
        }
    }
}

export async function fetchBlocks() {
    try {
        console.log('🧱 Fetching blocks...');
        const response = await api.get('/api?endpoint=blocks');
        
        // ENHANCED: Handle new response format from server
        if (response.data.error) {
            console.error('❌ Block API error:', response.data);
            const error = new Error(response.data.error);
            error.serverData = response.data;
            error.isServerError = true;
            throw error;
        }
        
        // Handle both old format (direct array) and new format (with meta)
        const blocks = Array.isArray(response.data) ? response.data : response.data.data;
        
        if (response.data.meta) {
            console.log(`🧱 fetchBlocks: Retrieved ${blocks.length} blocks via ${response.data.meta.source}`);
            if (response.data.meta.errors) {
                console.warn('⚠️ Block API had fallback issues:', response.data.meta.errors);
            }
        }
        
        console.log(`✅ Block API: Loaded ${blocks.length} blocks successfully`);
        return blocks;
    } catch (error) {
        console.error('❌ Error fetching blocks in api.js:', error);
        
        // ENHANCED: Distinguish between network errors and API errors
        if (error.response) {
            // Server responded with error status
            const serverError = new Error(`Server error: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`);
            serverError.isServerError = true;
            serverError.status = error.response.status;
            serverError.serverData = error.response.data;
            throw serverError;
        } else if (error.request) {
            // Network error
            const networkError = new Error('Network error: Could not reach the server');
            networkError.isNetworkError = true;
            throw networkError;
        } else {
            // Other error (including server errors from above)
            throw error;
        }
    }
}

export async function fetchPrice() {
    try {
        console.log('💰 Fetching ERG price...');
        const response = await api.get('/api?endpoint=price');
        
        // Price endpoint typically doesn't fail critically, but handle errors gracefully
        if (response.data.error) {
            console.warn('⚠️ Price API using fallback:', response.data);
            // Still return the fallback price rather than throwing
            return response.data;
        }
        
        console.log(`💰 fetchPrice: Retrieved price $${response.data.price} from ${response.data.source}`);
        return response.data;
    } catch (error) {
        console.error('❌ Error fetching price in api.js:', error);
        
        // ENHANCED: For price, always return a fallback rather than throwing
        // This prevents the entire app from breaking due to price API issues
        if (error.response) {
            console.warn('⚠️ Price server error, using fallback price');
            return { 
                price: 1.0, 
                currency: 'USD', 
                source: 'fallback-server-error',
                error: `Server error: ${error.response.status}`
            };
        } else if (error.request) {
            console.warn('⚠️ Price network error, using fallback price');
            return { 
                price: 1.0, 
                currency: 'USD', 
                source: 'fallback-network-error',
                error: 'Network error'
            };
        } else {
            console.warn('⚠️ Price unknown error, using fallback price');
            return { 
                price: 1.0, 
                currency: 'USD', 
                source: 'fallback-unknown-error',
                error: error.message
            };
        }
    }
}

// NEW: Fetch detailed transaction data for origin analysis
export async function fetchTransactionDetails(transactionId) {
    try {
        console.log(`🔍 Fetching detailed data for transaction: ${transactionId}`);
        
        // Use the Ergo Platform API directly for transaction details
        const response = await axios.get(`https://api.ergoplatform.com/transactions/unconfirmed/${transactionId}`, {
            timeout: 10000
        });
        
        console.log(`✅ Retrieved detailed data for transaction: ${transactionId}`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error fetching transaction details for ${transactionId}:`, error);
        
        if (error.response && error.response.status === 404) {
            console.warn(`⚠️ Transaction ${transactionId} not found in unconfirmed pool (may be confirmed)`);
            return null;
        }
        
        throw error;
    }
}

// NEW: Batch fetch transaction details with rate limiting
export async function fetchTransactionDetailsBatch(transactionIds, batchSize = 5, delayMs = 200) {
    console.log(`📊 Fetching details for ${transactionIds.length} transactions in batches of ${batchSize}`);
    
    const results = [];
    const errors = [];
    
    for (let i = 0; i < transactionIds.length; i += batchSize) {
        const batch = transactionIds.slice(i, i + batchSize);
        console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(transactionIds.length / batchSize)}`);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (txId) => {
            try {
                const details = await fetchTransactionDetails(txId);
                return { id: txId, data: details, success: true };
            } catch (error) {
                errors.push({ id: txId, error: error.message });
                return { id: txId, error: error.message, success: false };
            }
        });
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach(result => {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            } else {
                errors.push({ error: result.reason.message });
            }
        });
        
        // Rate limiting delay between batches
        if (i + batchSize < transactionIds.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    
    console.log(`✅ Batch fetch complete: ${results.filter(r => r.success).length} successful, ${errors.length} errors`);
    
    return {
        successful: results.filter(r => r.success),
        errors: errors
    };
}

// ENHANCED: Function to add USD values to transactions with better error handling
export function addUsdValues(transactions, ergPrice) {
    if (!Array.isArray(transactions)) {
        console.error('❌ addUsdValues: transactions is not an array:', typeof transactions);
        return [];
    }
    
    if (typeof ergPrice !== 'number' || ergPrice <= 0) {
        console.warn('⚠️ addUsdValues: Invalid ERG price, using 1.0 as fallback:', ergPrice);
        ergPrice = 1.0;
    }
    
    console.log(`💵 Adding USD values to ${transactions.length} transactions at $${ergPrice} per ERG`);
    
    return transactions.map(tx => {
        try {
            const usd_value = (tx.value || 0) * ergPrice;
            return {
                ...tx,
                usd_value: Math.max(0, usd_value) // Ensure non-negative
            };
        } catch (error) {
            console.error('❌ Error processing transaction for USD conversion:', tx.id, error);
            return {
                ...tx,
                usd_value: 0 // Safe fallback
            };
        }
    });
}

// NEW: Validate origin data integrity
export function validateOriginData(transactions) {
    console.log(`🔍 Validating origin data for ${transactions.length} transactions...`);
    
    const issues = [];
    const originCounts = {};
    
    transactions.forEach((tx, index) => {
        // Check if origin exists
        if (!tx.origin) {
            issues.push(`Transaction ${index} (${tx.id?.substring(0, 8)}...) missing origin`);
        } else {
            originCounts[tx.origin] = (originCounts[tx.origin] || 0) + 1;
        }
        
        // Check if originConfig exists
        if (!tx.originConfig) {
            issues.push(`Transaction ${index} (${tx.id?.substring(0, 8)}...) missing originConfig`);
        }
        
        // Check isWallet flag exists
        if (tx.isWallet === undefined) {
            issues.push(`Transaction ${index} (${tx.id?.substring(0, 8)}...) missing isWallet flag`);
        }
    });
    
    if (issues.length > 0) {
        console.warn(`⚠️ Origin validation found ${issues.length} issues:`, issues.slice(0, 5));
        if (issues.length > 5) {
            console.warn(`... and ${issues.length - 5} more issues`);
        }
    } else {
        console.log(`✅ Origin validation passed for all ${transactions.length} transactions`);
    }
    
    console.log(`📊 Origin distribution:`, originCounts);
    
    return {
        valid: issues.length === 0,
        issues: issues,
        originCounts: originCounts
    };
}

// ENHANCED: Health check function to test API connectivity
export async function checkApiHealth() {
    console.log('🏥 Running comprehensive API health check...');
    
    const health = {
        transactions: { status: 'unknown', error: null, latency: null },
        blocks: { status: 'unknown', error: null, latency: null },
        price: { status: 'unknown', error: null, latency: null },
        ergoApi: { status: 'unknown', error: null, latency: null },
        originDetection: { status: 'unknown', error: null, transactionCount: 0 }
    };
    
    // Test each endpoint with timeout
    const testEndpoint = async (endpoint, name) => {
        const startTime = Date.now();
        try {
            const response = await api.get(`/api?endpoint=${endpoint}`, { timeout: 10000 });
            health[name].status = 'healthy';
            health[name].latency = Date.now() - startTime;
            
            // For transactions, also test origin detection
            if (name === 'transactions' && Array.isArray(response.data)) {
                const txWithOrigins = response.data.filter(tx => tx.origin);
                health.originDetection.status = txWithOrigins.length > 0 ? 'healthy' : 'warning';
                health.originDetection.transactionCount = txWithOrigins.length;
                
                if (txWithOrigins.length === 0) {
                    health.originDetection.error = 'No transactions have origin data';
                }
            }
        } catch (error) {
            health[name].status = 'unhealthy';
            health[name].error = error.message;
            health[name].latency = Date.now() - startTime;
        }
    };
    
    // Test direct Ergo API
    const testErgoApi = async () => {
        const startTime = Date.now();
        try {
            await axios.get('https://api.ergoplatform.com/transactions/unconfirmed?limit=1', { timeout: 10000 });
            health.ergoApi.status = 'healthy';
            health.ergoApi.latency = Date.now() - startTime;
        } catch (error) {
            health.ergoApi.status = 'unhealthy';
            health.ergoApi.error = error.message;
            health.ergoApi.latency = Date.now() - startTime;
        }
    };
    
    await Promise.allSettled([
        testEndpoint('transactions', 'transactions'),
        testEndpoint('blocks', 'blocks'),
        testEndpoint('price', 'price'),
        testErgoApi()
    ]);
    
    console.log('🏥 API Health Check Results:', health);
    return health;
}

// ENHANCED: Retry wrapper for critical API calls
export async function retryApiCall(apiFunction, maxRetries = 2, delayMs = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            console.log(`🔄 API call attempt ${attempt}/${maxRetries + 1}`);
            const result = await apiFunction();
            
            if (attempt > 1) {
                console.log(`✅ API call succeeded on attempt ${attempt}`);
            }
            
            return result;
        } catch (error) {
            lastError = error;
            
            if (attempt <= maxRetries) {
                console.warn(`⚠️ API call attempt ${attempt} failed, retrying in ${delayMs}ms:`, error.message);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                delayMs *= 1.5; // Exponential backoff
            } else {
                console.error(`❌ API call failed after ${attempt} attempts:`, error.message);
            }
        }
    }
    
    throw lastError;
}

// ENHANCED: Wrapper functions with retry logic for critical endpoints
export async function fetchTransactionsWithRetry(maxRetries = 2) {
    return retryApiCall(() => fetchTransactions(), maxRetries);
}

export async function fetchBlocksWithRetry(maxRetries = 2) {
    return retryApiCall(() => fetchBlocks(), maxRetries);
}

// Price doesn't need retry since it has built-in fallback
export { fetchPrice as fetchPriceWithRetry };

// NEW: Debug function to test origin detection on sample data
export async function debugOriginDetection() {
    try {
        console.log('🧪 Running origin detection debug test...');
        
        const response = await api.get('/api?endpoint=transactions');
        const transactions = Array.isArray(response.data) ? response.data : response.data.data;
        const sampleSize = Math.min(transactions.length, 10);
        const sampleTransactions = transactions.slice(0, sampleSize);
        
        console.log(`🔍 Testing origin detection on ${sampleSize} sample transactions...`);
        
        const processedSample = processTransactionsWithOrigins(sampleTransactions);
        const validation = validateOriginData(processedSample);
        
        console.log('🧪 Debug Results:');
        console.log('   Sample size:', sampleSize);
        console.log('   Validation passed:', validation.valid);
        console.log('   Issues found:', validation.issues.length);
        console.log('   Origin distribution:', validation.originCounts);
        
        return {
            sampleSize,
            validation,
            sampleTransactions: processedSample
        };
    } catch (error) {
        console.error('❌ Origin detection debug failed:', error);
        throw error;
    }
}