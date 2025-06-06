import { json } from '@sveltejs/kit';

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
            console.log('📡 Fetching transactions...');
            return getTransactions();
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
    
    // Create AbortController for timeout
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
            // Small delay before backup attempt
            await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
            
            const response = await robustFetch(backupUrl, options);
            console.log(`✅ Backup API successful: ${API_CONFIG.backup.name}`);
            return { response, source: API_CONFIG.backup.name };
        } catch (backupError) {
            console.error(`❌ Both APIs failed:`);
            console.error(`  Primary (${API_CONFIG.primary.name}): ${primaryError.message}`);
            console.error(`  Backup (${API_CONFIG.backup.name}): ${backupError.message}`);
            
            // Throw the more descriptive error
            throw new Error(`All APIs failed - Primary: ${primaryError.message}, Backup: ${backupError.message}`);
        }
    }
}

async function getTransactions() {
    console.log('🔥 getTransactions() function called');
    
    // Ergo fee address - this is where transaction fees go
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
        
        // Process transactions with single API fee calculation
        for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i];
            
            try {
                // Log progress for larger batches
                if (i % 50 === 0) {
                    console.log(`📈 Processing transaction ${i + 1}/${transactions.length}...`);
                }
                
                // Extract basic info from unconfirmed API
                const inputAddresses = [];
                for (const input of tx.inputs || []) {
                    if (input.address) {
                        inputAddresses.push({
                            address: input.address,
                            value: (input.value || 0) / 1_000_000_000
                        });
                    }
                }
                
                const outputAddresses = [];
                for (const output of tx.outputs || []) {
                    if (output.address) {
                        outputAddresses.push({
                            address: output.address,
                            value: (output.value || 0) / 1_000_000_000
                        });
                    }
                }
                
                // **SINGLE API APPROACH**: Find fee by looking for fee address in outputs
                let transactionFee = 0.001; // Default fallback
                let feeSource = 'fallback';
                
                // Debug logging for first few transactions
                if (i < 3) {
                    console.log(`🔍 Transaction ${tx.id?.substring(0, 8) || 'unknown'} analysis:`);
                    console.log(`  Available fields:`, Object.keys(tx));
                    console.log(`  Output count: ${tx.outputs?.length || 0}`);
                    
                    // Show first few outputs for structure understanding
                    if (tx.outputs && tx.outputs.length > 0) {
                        console.log(`  First output structure:`, Object.keys(tx.outputs[0]));
                        console.log(`  First output address: ${tx.outputs[0].address?.substring(0, 20)}...`);
                        console.log(`  First output value: ${tx.outputs[0].value} nanoERG`);
                    }
                }
                
                // Look for the fee address in outputs
                if (tx.outputs && tx.outputs.length > 0) {
                    let feeOutput = null;
                    
                    for (const output of tx.outputs) {
                        if (output.address === ERGO_FEE_ADDRESS) {
                            feeOutput = output;
                            break;
                        }
                    }
                    
                    if (feeOutput) {
                        // Found the fee output - get its value
                        const feeValueNanoErg = feeOutput.value || 0;
                        transactionFee = feeValueNanoErg / 1_000_000_000; // Convert nanoERG to ERG
                        feeSource = 'fee-address-output';
                        
                        if (i < 5) { // Log details for first 5 transactions
                            console.log(`✅ Transaction ${tx.id?.substring(0, 8)}: Found fee output`);
                            console.log(`   Fee address: ${ERGO_FEE_ADDRESS.substring(0, 20)}...`);
                            console.log(`   Fee value: ${feeValueNanoErg} nanoERG = ${transactionFee.toFixed(6)} ERG`);
                        }
                    } else {
                        // No fee output found - this shouldn't happen but let's handle it
                        console.warn(`⚠️ Transaction ${tx.id?.substring(0, 8)}: No fee address output found`);
                        feeSource = 'fallback-no-fee-output';
                        
                        if (i < 3) {
                            console.log(`  Available output addresses:`);
                            tx.outputs.forEach((output, idx) => {
                                console.log(`    Output ${idx}: ${output.address?.substring(0, 30)}...`);
                            });
                        }
                    }
                } else {
                    console.warn(`⚠️ Transaction ${tx.id?.substring(0, 8)}: No outputs found`);
                    feeSource = 'fallback-no-outputs';
                }
                
                // Validate fee is reasonable
                if (transactionFee <= 0 || transactionFee > 10) {
                    if (i < 3) {
                        console.warn(`⚠️ Transaction ${tx.id?.substring(0, 8)}: Unreasonable fee ${transactionFee.toFixed(6)} ERG, using 0.001 ERG fallback`);
                    }
                    transactionFee = 0.001;
                    feeSource = 'fallback-unreasonable';
                }
                
                if (i < 3) {
                    console.log(`  ✅ Final fee: ${transactionFee.toFixed(6)} ERG (source: ${feeSource})`);
                    console.log(`---`);
                }
                
                processedTransactions.push({
                    id: tx.id,
                    size: tx.size,
                    value: (tx.outputs?.reduce((sum, output) => sum + (output.value || 0), 0) || 0) / 1_000_000_000,
                    fee: transactionFee,
                    feeSource: feeSource, // Debug info
                    inputs: inputAddresses,
                    outputs: outputAddresses
                });
                
            } catch (error) {
                console.error(`❌ Skipping transaction ${tx.id?.substring(0, 8) || 'unknown'} due to error: ${error.message}`);
            }
        }
        
        // Summary logging
        const totalCalculatedFees = processedTransactions.reduce((sum, tx) => sum + tx.fee, 0);
        const feeSourceStats = processedTransactions.reduce((stats, tx) => {
            stats[tx.feeSource] = (stats[tx.feeSource] || 0) + 1;
            return stats;
        }, {});
        
        console.log(`📊 Processing Summary (via ${source}):`);
        console.log(`   Processed: ${processedTransactions.length} transactions`);
        console.log(`   Total fees: ${totalCalculatedFees.toFixed(6)} ERG`);
        console.log(`   Fee sources:`, feeSourceStats);
        
        // Additional validation logging
        const successfulFees = processedTransactions.filter(tx => tx.feeSource === 'fee-address-output').length;
        const successRate = (successfulFees / processedTransactions.length * 100).toFixed(1);
        console.log(`   Fee detection success rate: ${successRate}% (${successfulFees}/${processedTransactions.length})`);
        
        return json(processedTransactions);
        
    } catch (error) {
        console.error('❌ Failed to fetch transactions from all APIs:', error);
        return json({ error: 'Failed to fetch transactions from all available APIs' }, { status: 500 });
    }
}

/**
 * Enhanced getMinerFees with fallback API support
 * Get miner fees using the same logic as Flask get_blocks.py
 * Finds the miner's address output that has no assets (empty array)
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
        
        // Search through ALL transactions in the block, not just the coinbase
        for (let txIndex = 0; txIndex < blockInfo.blockTransactions.length; txIndex++) {
            const transaction = blockInfo.blockTransactions[txIndex];
            
            if (!transaction.outputs) continue;
            
            // Look for the miner's output that has NO assets (this contains the fees)
            for (let outputIndex = 0; outputIndex < transaction.outputs.length; outputIndex++) {
                const output = transaction.outputs[outputIndex];
                
                if (output.address === minerAddress) {
                    const assets = output.assets || [];
                    
                    // We want the output with NO assets (empty array)
                    if (assets.length === 0) {
                        const feesNanoErg = output.value || 0;
                        const feesErg = feesNanoErg / 1_000_000_000;
                        console.log(`Found miner fees for ${blockId} in transaction ${txIndex}, output ${outputIndex}: ${feesErg.toFixed(6)} ERG (via ${source})`);
                        return feesErg;
                    } else {
                        console.log(`Skipping miner output with assets in transaction ${txIndex} for ${blockId} (via ${source})`);
                    }
                }
            }
        }
        
        // If no asset-free miner output found, return 0 fees
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
                
                // Convert base minerReward from nanoERG to ERG (same as Flask)
                const baseMinerReward = block.minerReward / 1_000_000_000;
                
                // Get the fees from block outputs using Flask logic with fallback support
                const minerAddress = block.miner.address;
                const fees = await getMinerFees(block.id, minerAddress);
                
                // Total block value = actual miner reward + fees (same as Flask)
                const totalBlockValue = baseMinerReward + fees;
                
                const blockInfo = {
                    height: block.height,
                    minerAddress: minerAddress,
                    transactionsCount: block.transactionsCount,
                    size: block.size,
                    baseMinerReward: baseMinerReward,  // Base reward from API (matches Flask "minerReward")
                    minerReward: totalBlockValue,      // TOTAL REWARD (base + fees) - this is what displays
                    totalFees: fees,                   // Fees from outputs (Flask logic)
                    totalBlockValue: totalBlockValue,  // API reward + fees (same as minerReward)
                    timestamp: block.timestamp,
                    miner: block.miner.name,
                    id: block.id,
                    apiSource: source                  // Track which API was used
                };
                
                blocksInfo.push(blockInfo);
                
            } catch (blockError) {
                console.error(`❌ Error processing block ${block.height}: ${blockError.message}`);
                // Continue with other blocks instead of failing completely
                continue;
            }
        }
        
        console.log(`✅ Successfully processed ${blocksInfo.length} blocks (via ${source})`);
        
        // Add API source info to response for debugging
        const response_data = {
            blocks: blocksInfo,
            apiSource: source,
            timestamp: new Date().toISOString()
        };
        
        // For backward compatibility, return just the blocks array but with source info
        blocksInfo.forEach(block => {
            block._meta = {
                apiSource: source,
                fetchTime: new Date().toISOString()
            };
        });
        
        return json(blocksInfo);
        
    } catch (error) {
        console.error('❌ Failed to fetch blocks from all APIs:', error);
        
        // Return empty array instead of error to prevent UI breaking
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