// FIXED src/routes/api/+server.js - Add Origin Detection to API Response
import { json } from '@sveltejs/kit';
import { processTransactionsWithOrigins } from '$lib/transactionOrigins.js';

// API Configuration with fallback
const API_CONFIG = {
    primary: {
        name: 'Ergoplatform',
        base: 'https://api.ergoplatform.com',
        blocks: 'https://api.ergoplatform.com/api/v1/blocks',
        transactions: 'https://api.ergoplatform.com/transactions/unconfirmed'
    },
    backup: {
        name: 'Cornell',
        base: 'https://api.ergo.aap.cornell.edu',
        blocks: 'https://api.ergo.aap.cornell.edu/api/v1/blocks',
        transactions: 'https://api.ergo.aap.cornell.edu/transactions/unconfirmed'
    },
    timeout: 10000,
    retryDelay: 1000
};

export async function GET({ url }) {
    const endpoint = url.searchParams.get('endpoint');
    
    console.log('🚀 API route called with endpoint:', endpoint);
    
    switch (endpoint) {
        case 'transactions':
            console.log('📡 Fetching transactions with origin detection...');
            return getTransactionsWithOrigins();
        case 'blocks':
            console.log('🧱 Fetching blocks...');
            return getBlocks();
        case 'price':
            console.log('💰 Fetching price...');
            return getPrice();
        default:
            console.log('❌ Invalid endpoint:', endpoint);
            return json({ error: 'Invalid endpoint' }, { status: 400 });
    }
}

/**
 * Enhanced fetch with primary/backup API support and timeout handling
 */
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

/**
 * Try primary API, fall back to backup if needed
 */
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

// NEW: Enhanced getTransactions with automatic origin detection
async function getTransactionsWithOrigins() {
    console.log('🔥 getTransactionsWithOrigins() function called');
    
    const ERGO_FEE_ADDRESS = "2iHkR7CWvD1R4j1yZg5bkeDRQavjAaVPeTDFGGLZduHyfWMuYpmhHocX8GJoaieTx78FntzJbCBVL6rf96ocJoZdmWBL2fci7NqWgAirppPQmZ7fN9V6z13Ay6brPriBKYqLp1bT2Fk4FkFLCfdPpe";
    
    try {
        console.log('📞 Making API call for unconfirmed transactions...');
        
        const primaryUrl = `${API_CONFIG.primary.transactions}?limit=99999&offset=0&sortBy=size&sortDirection=desc`;
        const backupUrl = `${API_CONFIG.backup.transactions}?limit=99999&offset=0&sortBy=size&sortDirection=desc`;
        
        const { response, source } = await fetchWithFallback(primaryUrl, backupUrl);
        console.log(`📡 Transactions API response from ${source}: ${response.status} ${response.statusText}`);
        
        const data = await response.json();
        console.log('📦 API response data keys:', Object.keys(data));
        console.log('📊 Transaction count:', data.items?.length || 0);
        
        const transactions = data.items || [];
        const processedTransactions = [];
        
        // Process transactions with fee calculation
        for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i];
            
            try {
                if (i % 50 === 0) {
                    console.log(`📈 Processing transaction ${i + 1}/${transactions.length}...`);
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
        
        // NEW: Add origin detection to all transactions
        console.log(`🔍 Adding origin detection to ${processedTransactions.length} transactions...`);
        const transactionsWithOrigins = processTransactionsWithOrigins(processedTransactions);
        
        // Summary logging
        const totalCalculatedFees = transactionsWithOrigins.reduce((sum, tx) => sum + tx.fee, 0);
        const originCounts = transactionsWithOrigins.reduce((counts, tx) => {
            counts[tx.origin] = (counts[tx.origin] || 0) + 1;
            return counts;
        }, {});
        
        console.log(`📊 Processing Summary (via ${source}):`);
        console.log(`   Processed: ${transactionsWithOrigins.length} transactions`);
        console.log(`   Total fees: ${totalCalculatedFees.toFixed(6)} ERG`);
        console.log(`   Origin breakdown:`, originCounts);
        
        return json(transactionsWithOrigins);
        
    } catch (error) {
        console.error('❌ Failed to fetch transactions from all APIs:', error);
        return json({ error: 'Failed to fetch transactions from all available APIs' }, { status: 500 });
    }
}

/**
 * Enhanced getMinerFees with fallback API support
 */
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

/**
 * Enhanced getBlocks with robust API handling and fallback support
 */
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