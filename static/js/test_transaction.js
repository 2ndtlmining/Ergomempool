// test_transaction.js - Dedicated test transaction functionality

const TEST_CONFIG = {
    defaultAmount: "0.001",
    minAmount: "0.001",
    maxAmount: "100.0",
    defaultAddress: "9f4WEgtBoWrtMa4HoUmxA3NSeWMU9PZRvArVGrSS3whSWfGDBoY" // Different default for testing
};

// Ergo protocol constants (same as donation)
const TEST_NANOERGS_PER_ERG = 1000000000n;
const TEST_MIN_FEE = 1000000n; // 0.001 ERG minimum fee
const TEST_FEE_ERGOTREE = "1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304";

let testTransactionInProgress = false;

// ===================================================================
// UTILITY FUNCTIONS (reused from donation.js)
// ===================================================================

function validateTestAmount(amount) {
    const ergAmount = parseFloat(amount);
    return !isNaN(ergAmount) && 
           ergAmount >= parseFloat(TEST_CONFIG.minAmount) && 
           ergAmount <= parseFloat(TEST_CONFIG.maxAmount);
}

/**
 * Decodes a base58 address
 */
function testBase58Decode(str) {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const ALPHABET_MAP = {};
    for (let i = 0; i < ALPHABET.length; i++) {
        ALPHABET_MAP[ALPHABET[i]] = i;
    }

    let decoded = [0];

    for (let i = 0; i < str.length; i++) {
        let carry = ALPHABET_MAP[str[i]];
        if (carry === undefined) throw new Error('Invalid base58 character');

        for (let j = 0; j < decoded.length; j++) {
            carry += decoded[j] * 58;
            decoded[j] = carry & 255;
            carry >>= 8;
        }

        while (carry > 0) {
            decoded.push(carry & 255);
            carry >>= 8;
        }
    }

    // Handle leading zeros
    for (let i = 0; i < str.length && str[i] === '1'; i++) {
        decoded.push(0);
    }

    return new Uint8Array(decoded.reverse());
}

/**
 * Converts Ergo address to ErgoTree
 */
function testAddressToErgoTree(address) {
    try {
        const decoded = testBase58Decode(address);

        // Verify P2PK format
        if (decoded.length < 34 || decoded[0] !== 0x01) {
            throw new Error(`Invalid P2PK address format`);
        }

        // Extract public key (bytes 1-33)
        const publicKey = decoded.slice(1, 34);
        const publicKeyHex = Array.from(publicKey, byte =>
            byte.toString(16).padStart(2, '0')
        ).join('');

        // Build P2PK ErgoTree: 0008cd + publicKey
        return `0008cd${publicKeyHex}`;

    } catch (error) {
        console.error(`Test address conversion failed: ${error.message}`);
        throw error;
    }
}

/**
 * Selects UTXOs to cover required amount and collects all tokens
 */
function testSelectInputsAndTokens(utxos, requiredAmount) {
    // Sort UTXOs by value (largest first)
    const sortedUtxos = [...utxos].sort((a, b) =>
        Number(BigInt(b.value) - BigInt(a.value))
    );

    let selectedInputs = [];
    let totalInputValue = 0n;
    const allTokens = new Map();

    for (const utxo of sortedUtxos) {
        selectedInputs.push(utxo);
        totalInputValue += BigInt(utxo.value);

        // Collect all tokens from this UTXO
        if (utxo.assets && utxo.assets.length > 0) {
            utxo.assets.forEach(token => {
                const existing = allTokens.get(token.tokenId) || 0n;
                allTokens.set(token.tokenId, existing + BigInt(token.amount));
            });
        }

        if (totalInputValue >= requiredAmount) {
            break;
        }
    }

    if (totalInputValue < requiredAmount) {
        throw new Error(
            `Insufficient funds. Need ${Number(requiredAmount) / Number(TEST_NANOERGS_PER_ERG)} ERG ` +
            `but only have ${Number(totalInputValue) / Number(TEST_NANOERGS_PER_ERG)} ERG`
        );
    }

    return { selectedInputs, totalInputValue, allTokens };
}

/**
 * Converts token map to output format
 */
function testTokensToOutputFormat(tokenMap) {
    return Array.from(tokenMap.entries()).map(([tokenId, amount]) => ({
        tokenId,
        amount: amount.toString()
    }));
}

// ===================================================================
// TEST TRANSACTION BUILDING
// ===================================================================

/**
 * Builds a test transaction according to Ergo protocol
 */
async function buildTestTransaction(testAmountERG, recipientAddress) {
    if (!walletConnector?.isConnected) {
        throw new Error('Wallet not connected');
    }

    // Convert amount to nanoERGs
    const testAmount = BigInt(Math.floor(testAmountERG * Number(TEST_NANOERGS_PER_ERG)));
    const totalRequired = testAmount + TEST_MIN_FEE;

    // Get blockchain data
    const currentHeight = await window.ergo.get_current_height();
    const utxos = await window.ergo.get_utxos();
    const changeAddress = await window.ergo.get_change_address();

    if (!utxos || utxos.length === 0) {
        throw new Error('No UTXOs available');
    }

    // Select inputs
    const { selectedInputs, totalInputValue, allTokens } = testSelectInputsAndTokens(utxos, totalRequired);

    // Get ErgoTrees
    const recipientErgoTree = testAddressToErgoTree(recipientAddress);
    const changeErgoTree = testAddressToErgoTree(changeAddress);

    // Verify addresses are different
    if (recipientErgoTree === changeErgoTree) {
        throw new Error('Test and change addresses cannot be the same');
    }

    // Build outputs
    const outputs = [];

    // OUTPUT 1: Test payment (pure ERG, no tokens)
    outputs.push({
        value: testAmount.toString(),
        ergoTree: recipientErgoTree,
        assets: [],
        additionalRegisters: {},
        creationHeight: currentHeight
    });

    // OUTPUT 2: Fee (explicit fee output)
    outputs.push({
        value: TEST_MIN_FEE.toString(),
        ergoTree: TEST_FEE_ERGOTREE,
        assets: [],
        additionalRegisters: {},
        creationHeight: currentHeight
    });

    // OUTPUT 3: Change (remaining ERG + ALL tokens)
    const changeAmount = totalInputValue - testAmount - TEST_MIN_FEE;

    if (changeAmount > 0n || allTokens.size > 0) {
        const changeTokens = testTokensToOutputFormat(allTokens);

        // Ensure minimum value for box with tokens
        let finalChangeAmount = changeAmount;
        if (changeAmount < 1000000n && allTokens.size > 0) {
            finalChangeAmount = 1000000n;
        }

        if (finalChangeAmount > 0n || changeTokens.length > 0) {
            outputs.push({
                value: finalChangeAmount.toString(),
                ergoTree: changeErgoTree,
                assets: changeTokens,
                additionalRegisters: {},
                creationHeight: currentHeight
            });
        }
    }

    // Build transaction
    const transaction = {
        inputs: selectedInputs,
        outputs: outputs,
        dataInputs: []
    };

    // Critical balance verification
    const totalOutputValue = outputs.reduce((sum, output) => sum + BigInt(output.value), 0n);
    if (totalInputValue !== totalOutputValue) {
        throw new Error(`Balance mismatch! Inputs: ${Number(totalInputValue)} ≠ Outputs: ${Number(totalOutputValue)}`);
    }

    return transaction;
}

// ===================================================================
// MAIN TEST TRANSACTION FUNCTION
// ===================================================================

/**
 * Main test transaction processing function
 */
async function processTestTransaction(testAmount, recipientAddress) {
    if (testTransactionInProgress) {
        showTestStatus('Test transaction already in progress...', 'info');
        return;
    }
    
    testTransactionInProgress = true;
    
    try {
        console.log('🧪 Starting TEST TRANSACTION process');
        showTestStatus('Preparing test transaction...', 'info');

        if (!walletConnector?.isConnected) {
            throw new Error('Wallet not connected');
        }

        if (!validateTestAmount(testAmount)) {
            throw new Error(`Invalid amount. Must be between ${TEST_CONFIG.minAmount} and ${TEST_CONFIG.maxAmount} ERG`);
        }

        // Check wallet balance
        const balance = await window.ergo.get_balance();
        const testAmountERG = parseFloat(testAmount);
        const requiredTotal = testAmountERG + 0.001; // test + fee
        const availableERG = Number(balance) / Number(TEST_NANOERGS_PER_ERG);
        
        if (availableERG < requiredTotal) {
            throw new Error(`Insufficient funds. Need ${requiredTotal.toFixed(3)} ERG, have ${availableERG.toFixed(3)} ERG`);
        }

        showTestStatus('Building test transaction...', 'info');

        // Build the transaction
        const transaction = await buildTestTransaction(testAmountERG, recipientAddress);

        showTestStatus('Please approve the test transaction in your wallet...', 'info');

        // Sign transaction
        let signedTransaction;
        try {
            signedTransaction = await window.ergo.sign_tx(transaction);
            
        } catch (signError) {
            if (signError.info === "User rejected." || signError.code === 2) {
                throw new Error('Test transaction was cancelled by user');
            }
            
            throw new Error(`Test transaction signing failed: ${signError.info || signError.message || 'Unknown error'}`);
        }

        // Submit transaction
        showTestStatus('Submitting test transaction to blockchain...', 'info');
        
        const txId = await window.ergo.submit_tx(signedTransaction);

        // Track this as a test transaction for visualization
        console.log('🧪 Test transaction submitted:', txId);
        if (typeof window.trackSpecialTransaction === 'function') {
            console.log('🧪 Tracking test transaction for visualization');
            window.trackSpecialTransaction(txId, 'test');
        } else {
            console.log('⚠️ Visualization tracking not available');
        }

        // Success!
        showTestStatus(`Test transaction successful! TX: ${txId.substring(0, 16)}...`, 'success');
        
        return txId;

    } catch (error) {
        console.error('Test transaction error:', error);
        
        let errorMessage = 'Test transaction failed: ';
        if (error.message.includes('cancelled') || error.message.includes('rejected')) {
            errorMessage += 'Transaction was cancelled by user';
        } else {
            errorMessage += error.message || 'Unknown error occurred';
        }
        
        showTestStatus(errorMessage, 'error');
        throw error;
    } finally {
        testTransactionInProgress = false;
    }
}

// ===================================================================
// UI FUNCTIONS
// ===================================================================

function showTestStatus(message, type = 'info') {
    const existingStatus = document.querySelector('.test-transaction-status');
    if (existingStatus) {
        existingStatus.remove();
    }

    const statusDiv = document.createElement('div');
    statusDiv.className = `test-transaction-status ${type}`;
    statusDiv.textContent = message;
    statusDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        ${type === 'success' ? 'background: #27ae60;' : ''}
        ${type === 'error' ? 'background: #e74c3c;' : ''}
        ${type === 'info' ? 'background: #3498db;' : ''}
    `;
    document.body.appendChild(statusDiv);
    
    setTimeout(() => statusDiv.style.transform = 'translateX(0)', 100);
    
    const hideDelay = (type === 'info') ? 4000 : 6000;
    setTimeout(() => {
        statusDiv.style.transform = 'translateX(100%)';
        setTimeout(() => statusDiv.remove(), 300);
    }, hideDelay);
}

function showTestTransactionModal() {
    if (!walletConnector?.isConnected) {
        showTestStatus('Please connect your wallet first', 'error');
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'test-modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    const modal = document.createElement('div');
    modal.className = 'test-modal';
    modal.style.cssText = `
        background: #1a1a1a;
        border-radius: 12px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        border: 1px solid #333;
        transform: translateY(-20px);
        transition: transform 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div class="test-modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="color: #f39c12; margin: 0;">🧪 Test Transaction</h3>
            <button class="modal-close" style="background: none; border: none; color: #999; font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        <div class="test-modal-content">
            <p style="color: #ccc; margin-bottom: 20px;">Send a test transaction to any Ergo address.</p>
            <div class="test-amount-section" style="margin-bottom: 20px;">
                <label for="test-amount" style="color: #fff; display: block; margin-bottom: 8px;">Amount (ERG):</label>
                <input type="number" 
                       id="test-amount" 
                       placeholder="${TEST_CONFIG.defaultAmount}"
                       min="${TEST_CONFIG.minAmount}"
                       max="${TEST_CONFIG.maxAmount}"
                       step="0.001"
                       value="${TEST_CONFIG.defaultAmount}"
                       style="width: 100%; padding: 10px; border: 1px solid #333; border-radius: 6px; background: #2a2a2a; color: #fff;">
            </div>
            <div class="test-address-section" style="margin-bottom: 20px;">
                <label for="test-address" style="color: #fff; display: block; margin-bottom: 8px;">Recipient Address:</label>
                <input type="text" 
                       id="test-address" 
                       placeholder="9f..."
                       value="${TEST_CONFIG.defaultAddress}"
                       style="width: 100%; padding: 10px; border: 1px solid #333; border-radius: 6px; background: #2a2a2a; color: #fff;">
                <small style="color: #888; display: block; margin-top: 4px;">Enter any valid Ergo address</small>
            </div>
            <div class="test-warning" style="margin-bottom: 20px;">
                <p style="color: #f39c12; margin: 0;"><small>⚠️ This will send real ERG! Use small amounts for testing.</small></p>
            </div>
            <div class="test-modal-actions" style="display: flex; gap: 10px;">
                <button class="test-btn" id="confirm-test-transaction" style="flex: 1; background: #f39c12; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: 500;">🚀 Send Test</button>
                <button class="cancel-btn" id="cancel-test-transaction" style="flex: 1; background: #666; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer;">Cancel</button>
            </div>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const closeModal = () => {
        overlay.style.opacity = '0';
        modal.style.transform = 'translateY(-20px)';
        setTimeout(() => document.body.removeChild(overlay), 300);
    };
    
    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
    
    document.getElementById('cancel-test-transaction').addEventListener('click', closeModal);
    
    document.getElementById('confirm-test-transaction').addEventListener('click', async () => {
        const testBtn = document.getElementById('confirm-test-transaction');
        const originalText = testBtn.textContent;
        
        try {
            testBtn.disabled = true;
            testBtn.textContent = 'Processing...';
            testBtn.style.background = '#666';
            
            const amount = document.getElementById('test-amount').value;
            const address = document.getElementById('test-address').value.trim();
            
            // Validate amount
            if (!validateTestAmount(amount)) {
                showTestStatus('Invalid amount. Please enter between 0.001 and 100.0 ERG', 'error');
                return;
            }
            
            // Validate address
            if (!address || address.length < 10) {
                showTestStatus('Please enter a valid Ergo address', 'error');
                return;
            }
            
            // Basic address format check
            if (!address.match(/^9[A-Za-z0-9]+$/)) {
                showTestStatus('Invalid address format. Ergo addresses start with "9"', 'error');
                return;
            }
            
            closeModal();
            await processTestTransaction(amount, address);
            
        } catch (error) {
            console.error('Test transaction modal error:', error);
        } finally {
            if (testBtn && !testBtn.closest('.test-modal-overlay').parentNode) {
                testBtn.disabled = false;
                testBtn.textContent = originalText;
                testBtn.style.background = '#f39c12';
            }
        }
    });
    
    // Show modal with animation
    setTimeout(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'translateY(0)';
    }, 10);
    
    // Focus and select amount field
    setTimeout(() => {
        document.getElementById('test-amount').focus();
        document.getElementById('test-amount').select();
    }, 100);
}

function initializeTestTransaction() {
    console.log('🧪 Initializing Test Transaction System');
    
    const testTransactionButton = document.getElementById('test-transaction-button');
    if (testTransactionButton) {
        testTransactionButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🧪 Test transaction button clicked');
            showTestTransactionModal();
        });
        console.log('✅ Test transaction button initialized');
    } else {
        console.warn('⚠️ Test transaction button not found');
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTestTransaction);
} else {
    initializeTestTransaction();
}