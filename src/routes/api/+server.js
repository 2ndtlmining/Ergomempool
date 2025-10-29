// ENHANCED src/routes/api/+server.js - Add Robust Transaction Caching and Validation
import { json } from '@sveltejs/kit';
import { processTransactionsWithOrigins } from '$lib/transactionOrigins.js';

// API Configuration with fallback (UNCHANGED)
const API_CONFIG = {
    primary: {
        name: 'Ergoplatform',
        base: 'https://api.ergoplatform.com',
        blocks: 'https://api.ergoplatform.com/api/v1/blocks',
        transactions: 'https://api.ergoplatform.com/transactions/unconfirmed'
    },
    backup: {
        name: 'P2p',
        base: 'https://api-p2p.ergoplatform.com/',
        blocks: 'https://api-p2p.ergoplatform.com/api/v1/blocks',
        transactions: 'https://api-p2p.ergoplatform.com/transactions/unconfirmed'
    },
    timeout: 10000,
    retryDelay: 1000
};

// NEW: Transaction cache configuration and storage
const CACHE_CONFIG = {
    MAX_AGE_MINUTES: 30,           // Remove transactions older than 30 minutes
    VALIDATION_BATCH_SIZE: 10,     // Validate this many transactions per check
    FULL_SYNC_INTERVAL_MS: 120000, // Full sync every 2 minutes
    QUICK_SYNC_INTERVAL_MS: 5000, // Quick sync every 5 seconds
    MAX_VALIDATION_FAILURES: 3,   // Remove after 3 failed validations
};

// NEW: In-memory transaction cache with metadata
let transactionCache = new Map();
let lastFullSync = null;

export async function GET({ url }) {
    const endpoint = url.searchParams.get('endpoint');
    
    console.log('🚀 API route called with endpoint:', endpoint);
    
    switch (endpoint) {
        case 'transactions':
            console.log('📡 Fetching transactions with robust caching...');
            return getTransactionsWithOrigins();
        case 'blocks':
            console.log('🧱 Fetching blocks...');
            return getBlocks();
        case 'price':
            console.log('💰 Fetching price...');
            return getPrice();
        case 'cache-stats':
            console.log('📊 Getting cache statistics...');
            return json(getCacheStats());
        default:
            console.log('❌ Invalid endpoint:', endpoint);
            return json({ error: 'Invalid endpoint' }, { status: 400 });
    }
}

// UNCHANGED: Enhanced fetch with primary/backup API support and timeout handling
async function robustFetch(url, options = {}) {
    const { timeout = API_CONFIG.timeout } = options;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// UNCHANGED: Try primary API, fall back to backup if needed
async function fetchWithFallback(primaryUrl, backupUrl, options = {}) {
    console.log(`🎯 Trying primary API: ${primaryUrl}`);
    
    try {
        const response = await robustFetch(primaryUrl, options);
        console.log(`✅ Primary API successful: ${API_CONFIG.primary.name}`);
        return { response, source: API_CONFIG.primary.name };
    } catch (primaryError) {
        console.warn(`⚠️ Primary API failed (${API_CONFIG.primary.name}): ${primaryError.message}`);
        console.log(`🔄 Trying backup API: ${backupUrl}`);
        
        try {
            await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
            
            const response = await robustFetch(backupUrl, options);
            console.log(`✅ Backup API successful: ${API_CONFIG.backup.name}`);
            return { response, source: API_CONFIG.backup.name };
        } catch (backupError) {
            console.error(`❌ Both APIs failed:`);
            console.error(`  Primary (${API_CONFIG.primary.name}): ${primaryError.message}`);
            console.error(`  Backup (${API_CONFIG.backup.name}): ${backupError.message}`);
            
            throw new Error(`All APIs failed - Primary: ${primaryError.message}, Backup: ${backupError.message}`);
        }
    }
}

// ENHANCED: getTransactions with robust caching and validation system
async function getTransactionsWithOrigins() {
    console.log('🔥 Enhanced robust transaction fetching started');
    
    try {
        const now = Date.now();
        const shouldDoFullSync = !lastFullSync || (now - lastFullSync) > CACHE_CONFIG.FULL_SYNC_INTERVAL_MS;
        
        if (shouldDoFullSync) {
            console.log('🔄 Performing full transaction sync');
            await performFullTransactionSync();
            lastFullSync = now;
        } else {
            console.log('⚡ Performing quick transaction validation');
            await performQuickTransactionValidation();
        }
        
        // Clean up old transactions
        cleanupOldTransactions();
        
        // Return current valid transactions
        const validTransactions = Array.from(transactionCache.values())
            .filter(item => item.valid && !item.confirmed)
            .map(item => item.transaction)
            .sort((a, b) => (b.size || 0) - (a.size || 0)); // Sort by size descending
        
        console.log(`✅ Returning ${validTransactions.length} validated transactions`);
        
        // Add origin detection (UNCHANGED)
        const transactionsWithOrigins = processTransactionsWithOrigins(validTransactions);
        
        return json(transactionsWithOrigins);
        
    } catch (error) {
        console.error('❌ Enhanced transaction fetching failed:', error);
        
        // Return cached transactions as fallback
        const cachedTransactions = Array.from(transactionCache.values())
            .filter(item => item.valid && !item.confirmed)
            .map(item => item.transaction);
            
        if (cachedTransactions.length > 0) {
            console.log(`🔄 Returning ${cachedTransactions.length} cached transactions as fallback`);
            const transactionsWithOrigins = processTransactionsWithOrigins(cachedTransactions);
            return json(transactionsWithOrigins);
        }
        
        return json({ error: 'Failed to fetch transactions from all available sources' }, { status: 500 });
    }
}

// NEW: Perform full sync - Get all unconfirmed transactions and update cache
async function performFullTransactionSync() {
    console.log('📡 Starting full transaction sync...');
    
    try {
        // Fetch from API (reusing existing logic)
        const primaryUrl = `${API_CONFIG.primary.transactions}?limit=99999&offset=0&sortBy=size&sortDirection=desc`;
        const backupUrl = `${API_CONFIG.backup.transactions}?limit=99999&offset=0&sortBy=size&sortDirection=desc`;
        
        const { response, source } = await fetchWithFallback(primaryUrl, backupUrl);
        const data = await response.json();
        const rawTransactions = data.items || [];
        
        console.log(`📦 Fetched ${rawTransactions.length} transactions from ${source}`);
        
        // Process new transactions (reusing existing processing logic)
        const processedTransactions = await processRawTransactions(rawTransactions, source);
        
        // Update cache with new transactions
        const newTransactionIds = new Set();
        processedTransactions.forEach(tx => {
            newTransactionIds.add(tx.id);
            
            if (transactionCache.has(tx.id)) {
                // Update existing transaction
                const existing = transactionCache.get(tx.id);
                transactionCache.set(tx.id, {
                    ...existing,
                    transaction: tx,
                    lastSeen: Date.now(),
                    valid: true,
                    validationFailures: 0
                });
            } else {
                // Add new transaction
                transactionCache.set(tx.id, {
                    transaction: tx,
                    firstSeen: Date.now(),
                    lastSeen: Date.now(),
                    valid: true,
                    confirmed: false,
                    validationFailures: 0,
                    source: source
                });
                console.log(`➕ New transaction cached: ${tx.id.substring(0, 8)}...`);
            }
        });
        
        // Mark transactions not in latest fetch as potentially stale
        transactionCache.forEach((item, txId) => {
            if (!newTransactionIds.has(txId) && item.valid) {
                console.log(`⚠️ Transaction ${txId.substring(0, 8)}... not in latest fetch, marking for validation`);
                item.needsValidation = true;
            }
        });
        
        console.log(`✅ Full sync complete: ${processedTransactions.length} transactions processed`);
        
    } catch (error) {
        console.error('❌ Full sync failed:', error);
        throw error;
    }
}

// NEW: Perform quick validation - Check existence of cached transactions that need validation
async function performQuickTransactionValidation() {
    const transactionsNeedingValidation = Array.from(transactionCache.entries())
        .filter(([id, item]) => item.needsValidation || item.validationFailures > 0)
        .slice(0, CACHE_CONFIG.VALIDATION_BATCH_SIZE);
    
    if (transactionsNeedingValidation.length === 0) {
        console.log('✅ No transactions need validation');
        return;
    }
    
    console.log(`🔍 Validating ${transactionsNeedingValidation.length} transactions...`);
    
    const validationPromises = transactionsNeedingValidation.map(async ([txId, item]) => {
        try {
            // Check if transaction still exists in unconfirmed pool
            const isValid = await validateTransactionExists(txId);
            
            if (isValid) {
                // Transaction still exists - mark as valid
                item.valid = true;
                item.lastSeen = Date.now();
                item.needsValidation = false;
                item.validationFailures = 0;
                console.log(`✅ Validated: ${txId.substring(0, 8)}... still unconfirmed`);
            } else {
                // Transaction not found - increment failure count
                item.validationFailures = (item.validationFailures || 0) + 1;
                
                if (item.validationFailures >= CACHE_CONFIG.MAX_VALIDATION_FAILURES) {
                    // Check if it was confirmed rather than disappeared
                    const isConfirmed = await checkIfTransactionConfirmed(txId);
                    
                    if (isConfirmed) {
                        item.confirmed = true;
                        item.valid = false;
                        console.log(`🎉 Transaction ${txId.substring(0, 8)}... was confirmed`);
                    } else {
                        item.valid = false;
                        console.log(`❌ Transaction ${txId.substring(0, 8)}... marked invalid after ${item.validationFailures} failures`);
                    }
                } else {
                    console.log(`⚠️ Validation failed for ${txId.substring(0, 8)}... (${item.validationFailures}/${CACHE_CONFIG.MAX_VALIDATION_FAILURES})`);
                }
            }
            
        } catch (error) {
            console.error(`❌ Error validating transaction ${txId.substring(0, 8)}...:`, error);
            item.validationFailures = (item.validationFailures || 0) + 1;
        }
    });
    
    await Promise.allSettled(validationPromises);
    console.log('✅ Quick validation complete');
}

// NEW: Check if a transaction still exists in the unconfirmed pool
async function validateTransactionExists(txId) {
    try {
        // Try primary API first
        const primaryUrl = `${API_CONFIG.primary.base}/transactions/unconfirmed/${txId}`;
        
        try {
            const response = await robustFetch(primaryUrl, { timeout: 8000 });
            return response.ok;
        } catch (primaryError) {
            // Try backup API
            const backupUrl = `${API_CONFIG.backup.base}/transactions/unconfirmed/${txId}`;
            
            try {
                const response = await robustFetch(backupUrl, { timeout: 8000 });
                return response.ok;
            } catch (backupError) {
                console.warn(`⚠️ Could not validate ${txId.substring(0, 8)}... on either API`);
                return false;
            }
        }
    } catch (error) {
        console.error(`❌ Error validating transaction existence for ${txId}:`, error);
        return false;
    }
}

// NEW: Check if a transaction was confirmed (moved to a block)
async function checkIfTransactionConfirmed(txId) {
    try {
        // Try to find the transaction in confirmed transactions
        const primaryUrl = `${API_CONFIG.primary.base}/transactions/${txId}`;
        
        try {
            const response = await robustFetch(primaryUrl, { timeout: 8000 });
            if (response.ok) {
                console.log(`🎉 Transaction ${txId.substring(0, 8)}... found in confirmed transactions`);
                return true;
            }
        } catch (primaryError) {
            // Try backup API
            const backupUrl = `${API_CONFIG.backup.base}/transactions/${txId}`;
            
            try {
                const response = await robustFetch(backupUrl, { timeout: 8000 });
                if (response.ok) {
                    console.log(`🎉 Transaction ${txId.substring(0, 8)}... found in confirmed transactions (backup API)`);
                    return true;
                }
            } catch (backupError) {
                // Transaction not found in confirmed either
            }
        }
        
        return false;
    } catch (error) {
        console.error(`❌ Error checking if transaction ${txId} was confirmed:`, error);
        return false;
    }
}

// NEW: Clean up old transactions from cache
function cleanupOldTransactions() {
    const now = Date.now();
    const maxAge = CACHE_CONFIG.MAX_AGE_MINUTES * 60 * 1000;
    let removedCount = 0;
    
    for (const [txId, item] of transactionCache.entries()) {
        const age = now - item.firstSeen;
        
        // Remove if too old, invalid, or confirmed
        if (age > maxAge || (!item.valid && item.validationFailures >= CACHE_CONFIG.MAX_VALIDATION_FAILURES) || item.confirmed) {
            transactionCache.delete(txId);
            removedCount++;
            
            const reason = item.confirmed ? 'confirmed' : 
                          age > maxAge ? 'expired' : 'invalid';
            console.log(`🗑️ Removed transaction ${txId.substring(0, 8)}... (${reason})`);
        }
    }
    
    if (removedCount > 0) {
        console.log(`🧹 Cleaned up ${removedCount} transactions from cache`);
    }
}

// NEW: Process raw transactions from API into our format (extracted from existing code)
async function processRawTransactions(rawTransactions, source) {
    const ERGO_FEE_ADDRESS = "2iHkR7CWvD1R4j1yZg5bkeDRQavjAaVPeTDFGGLZduHyfWMuYpmhHocX8GJoaieTx78FntzJbCBVL6rf96ocJoZdmWBL2fci7NqWgAirppPQmZ7fN9V6z13Ay6brPriBKYqLp1bT2Fk4FkFLCfdPpe";
    const processedTransactions = [];
    
    // Process transactions with fee calculation (UNCHANGED logic from original)
    for (let i = 0; i < rawTransactions.length; i++) {
        const tx = rawTransactions[i];
        
        try {
            if (i % 50 === 0) {
                console.log(`📈 Processing transaction ${i + 1}/${rawTransactions.length}...`);
            }
            
            // Extract input addresses
            const inputAddresses = [];
            for (const input of tx.inputs || []) {
                if (input.address) {
                    inputAddresses.push({
                        address: input.address,
                        value: (input.value || 0) / 1_000_000_000
                    });
                }
            }
            
            // Extract output addresses
            const outputAddresses = [];
            for (const output of tx.outputs || []) {
                if (output.address) {
                    outputAddresses.push({
                        address: output.address,
                        value: (output.value || 0) / 1_000_000_000
                    });
                }
            }
            
            // Calculate fee
            let transactionFee = 0.001;
            let feeSource = 'fallback';
            
            if (tx.outputs && tx.outputs.length > 0) {
                let feeOutput = null;
                
                for (const output of tx.outputs) {
                    if (output.address === ERGO_FEE_ADDRESS) {
                        feeOutput = output;
                        break;
                    }
                }
                
                if (feeOutput) {
                    const feeValueNanoErg = feeOutput.value || 0;
                    transactionFee = feeValueNanoErg / 1_000_000_000;
                    feeSource = 'fee-address-output';
                }
            }
            
            if (transactionFee <= 0 || transactionFee > 10) {
                transactionFee = 0.001;
                feeSource = 'fallback-unreasonable';
            }
            
            // Create transaction object
            const processedTx = {
                id: tx.id,
                size: tx.size,
                value: (tx.outputs?.reduce((sum, output) => sum + (output.value || 0), 0) || 0) / 1_000_000_000,
                fee: transactionFee,
                feeSource: feeSource,
                inputs: inputAddresses,
                outputs: outputAddresses
            };
            
            processedTransactions.push(processedTx);
            
        } catch (error) {
            console.error(`❌ Skipping transaction ${tx.id?.substring(0, 8) || 'unknown'} due to error: ${error.message}`);
        }
    }
    
    return processedTransactions;
}

// NEW: Get cache statistics for debugging
function getCacheStats() {
    const stats = {
        total: transactionCache.size,
        valid: 0,
        invalid: 0,
        confirmed: 0,
        needingValidation: 0,
        oldestTransaction: null,
        newestTransaction: null,
        lastFullSync: lastFullSync
    };
    
    let oldestTime = Date.now();
    let newestTime = 0;
    
    for (const [txId, item] of transactionCache.entries()) {
        if (item.valid) stats.valid++;
        if (!item.valid) stats.invalid++;
        if (item.confirmed) stats.confirmed++;
        if (item.needsValidation) stats.needingValidation++;
        
        if (item.firstSeen < oldestTime) {
            oldestTime = item.firstSeen;
            stats.oldestTransaction = txId.substring(0, 8) + '...';
        }
        
        if (item.firstSeen > newestTime) {
            newestTime = item.firstSeen;
            stats.newestTransaction = txId.substring(0, 8) + '...';
        }
    }
    
    return stats;
}

// UNCHANGED: Enhanced getMinerFees with fallback API support
async function getMinerFees(blockId, minerAddress) {
    try {
        const primaryUrl = `${API_CONFIG.primary.blocks}/${blockId}`;
        const backupUrl = `${API_CONFIG.backup.blocks}/${blockId}`;
        
        console.log(`🔍 Getting miner fees for block ${blockId}...`);
        
        const { response, source } = await fetchWithFallback(primaryUrl, backupUrl);
        console.log(`📡 Block details from ${source} for ${blockId}: ${response.status}`);
        
        const blockData = await response.json();
        
        if (!blockData.block) {
            console.log(`No 'block' key found in response for ${blockId} from ${source}`);
            return 0.0;
        }
        
        const blockInfo = blockData.block;
        
        if (!blockInfo.blockTransactions || blockInfo.blockTransactions.length === 0) {
            console.log(`No blockTransactions found for ${blockId} from ${source}`);
            return 0.0;
        }
        
        // Search through ALL transactions in the block
        for (let txIndex = 0; txIndex < blockInfo.blockTransactions.length; txIndex++) {
            const transaction = blockInfo.blockTransactions[txIndex];
            
            if (!transaction.outputs) continue;
            
            for (let outputIndex = 0; outputIndex < transaction.outputs.length; outputIndex++) {
                const output = transaction.outputs[outputIndex];
                
                if (output.address === minerAddress) {
                    const assets = output.assets || [];
                    
                    if (assets.length === 0) {
                        const feesNanoErg = output.value || 0;
                        const feesErg = feesNanoErg / 1_000_000_000;
                        console.log(`Found miner fees for ${blockId} in transaction ${txIndex}, output ${outputIndex}: ${feesErg.toFixed(6)} ERG (via ${source})`);
                        return feesErg;
                    }
                }
            }
        }
        
        console.log(`No asset-free miner output found for ${minerAddress} in block ${blockId} (via ${source})`);
        return 0.0;
        
    } catch (error) {
        console.error(`❌ Error getting miner fees for block ${blockId} from all APIs: ${error.message}`);
        return 0.0;
    }
}

// UNCHANGED: Enhanced getBlocks with robust API handling and fallback support
async function getBlocks() {
    try {
        console.log('🏗️ Fetching blocks with robust API handling...');
        
        const primaryUrl = `${API_CONFIG.primary.blocks}?limit=4`;
        const backupUrl = `${API_CONFIG.backup.blocks}?limit=4`;
        
        const { response, source } = await fetchWithFallback(primaryUrl, backupUrl);
        console.log(`📡 Blocks API response from ${source}: ${response.status} ${response.statusText}`);
        
        const data = await response.json();
        console.log(`📦 Retrieved ${data.items?.length || 0} blocks from ${source}`);
        
        const blocksInfo = [];
        
        for (let i = 0; i < data.items.length; i++) {
            const block = data.items[i];
            
            try {
                console.log(`🔨 Processing block ${i + 1}/${data.items.length}: ${block.height} (via ${source})`);
                
                const baseMinerReward = block.minerReward / 1_000_000_000;
                const minerAddress = block.miner.address;
                const fees = await getMinerFees(block.id, minerAddress);
                const totalBlockValue = baseMinerReward + fees;
                
                const blockInfo = {
                    height: block.height,
                    minerAddress: minerAddress,
                    transactionsCount: block.transactionsCount,
                    size: block.size,
                    baseMinerReward: baseMinerReward,
                    minerReward: totalBlockValue,
                    totalFees: fees,
                    totalBlockValue: totalBlockValue,
                    timestamp: block.timestamp,
                    miner: block.miner.name,
                    id: block.id,
                    apiSource: source
                };
                
                blocksInfo.push(blockInfo);
                
            } catch (blockError) {
                console.error(`❌ Error processing block ${block.height}: ${blockError.message}`);
                continue;
            }
        }
        
        console.log(`✅ Successfully processed ${blocksInfo.length} blocks (via ${source})`);
        
        blocksInfo.forEach(block => {
            block._meta = {
                apiSource: source,
                fetchTime: new Date().toISOString()
            };
        });
        
        return json(blocksInfo);
        
    } catch (error) {
        console.error('❌ Failed to fetch blocks from all APIs:', error);
        console.log('🔄 Returning empty blocks array to maintain UI stability');
        return json([]);
    }
}

// UNCHANGED: Price fetching
async function getPrice() {
    try {
        console.log('💰 Fetching ERG price...');
        
        const response = await robustFetch('https://erg-oracle-ergusd.spirepools.com/frontendData');
        
        let responseText = await response.text();
        if (responseText.startsWith('"') && responseText.endsWith('"')) {
            responseText = responseText.slice(1, -1);
        }
        
        responseText = responseText.replace(/\\"/g, '"');
        const data = JSON.parse(responseText);
        
        console.log(`✅ ERG price fetched: $${data.latest_price}`);
        
        return json({
            price: data.latest_price,
            currency: "USD",
            source: "ERG Oracle",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error fetching price:', error);
        console.log('🔄 Using fallback price: $1.00');
        
        return json({ 
            price: 1.0, 
            currency: "USD",
            source: "fallback",
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}