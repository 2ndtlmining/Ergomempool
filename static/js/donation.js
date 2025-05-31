// donation.js - Clean donation implementation for Ergo with Nautilus Wallet

const DONATION_CONFIG = {
    recipientAddress: "9hF8coEmr6Mnfh3gexuwnnU816kbW8qrVBoUraJC5Zb79T9DRnx",
    defaultAmount: "1.0",
    minAmount: "0.001",
    maxAmount: "100.0"
};

// Ergo protocol constants
const NANOERGS_PER_ERG = 1000000000n;
const MIN_FEE = 1000000n; // 0.001 ERG minimum fee
const FEE_ERGOTREE = "1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304";

let donationInProgress = false;

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

function ergToNanoErg(ergAmount) {
    return (BigInt(Math.floor(parseFloat(ergAmount) * Number(NANOERGS_PER_ERG)))).toString();
}

function validateDonationAmount(amount) {
    const ergAmount = parseFloat(amount);
    return !isNaN(ergAmount) && 
           ergAmount >= parseFloat(DONATION_CONFIG.minAmount) && 
           ergAmount <= parseFloat(DONATION_CONFIG.maxAmount);
}

/**
 * Decodes a base58 address
 */
function base58Decode(str) {
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
function addressToErgoTree(address) {
    try {
        const decoded = base58Decode(address);

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
        console.error(`Address conversion failed: ${error.message}`);

        // Hardcoded fallback for donation address
        if (address === DONATION_CONFIG.recipientAddress) {
            return "0008cd027ecf12ead2d42ab4ede6d6faf6f1fb0f2af84ee66a1a8be2f426b6bc2a2cccd4b";
        }

        throw error;
    }
}

/**
 * Selects UTXOs to cover required amount and collects all tokens
 */
function selectInputsAndTokens(utxos, requiredAmount) {
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
            `Insufficient funds. Need ${Number(requiredAmount) / Number(NANOERGS_PER_ERG)} ERG ` +
            `but only have ${Number(totalInputValue) / Number(NANOERGS_PER_ERG)} ERG`
        );
    }

    return { selectedInputs, totalInputValue, allTokens };
}

/**
 * Converts token map to output format
 */
function tokensToOutputFormat(tokenMap) {
    return Array.from(tokenMap.entries()).map(([tokenId, amount]) => ({
        tokenId,
        amount: amount.toString()
    }));
}

// ===================================================================
// TRANSACTION BUILDING
// ===================================================================

/**
 * Builds a proper donation transaction according to Ergo protocol
 */
async function buildDonationTransaction(donationAmountERG) {
    if (!walletConnector?.isConnected) {
        throw new Error('Wallet not connected');
    }

    // Always use donation address
    const targetAddress = DONATION_CONFIG.recipientAddress;

    // Convert amount to nanoERGs
    const donationAmount = BigInt(Math.floor(donationAmountERG * Number(NANOERGS_PER_ERG)));
    const totalRequired = donationAmount + MIN_FEE;

    // Get blockchain data
    const currentHeight = await window.ergo.get_current_height();
    const utxos = await window.ergo.get_utxos();
    const changeAddress = await window.ergo.get_change_address();

    if (!utxos || utxos.length === 0) {
        throw new Error('No UTXOs available');
    }

    // Select inputs
    const { selectedInputs, totalInputValue, allTokens } = selectInputsAndTokens(utxos, totalRequired);

    // Get ErgoTrees
    const donationErgoTree = addressToErgoTree(targetAddress);
    const changeErgoTree = addressToErgoTree(changeAddress);

    // Verify addresses are different
    if (donationErgoTree === changeErgoTree) {
        throw new Error('Donation and change addresses cannot be the same');
    }

    // Build outputs
    const outputs = [];

    // OUTPUT 1: Donation (pure ERG, no tokens)
    outputs.push({
        value: donationAmount.toString(),
        ergoTree: donationErgoTree,
        assets: [],
        additionalRegisters: {},
        creationHeight: currentHeight
    });

    // OUTPUT 2: Fee (explicit fee output)
    outputs.push({
        value: MIN_FEE.toString(),
        ergoTree: FEE_ERGOTREE,
        assets: [],
        additionalRegisters: {},
        creationHeight: currentHeight
    });

    // OUTPUT 3: Change (remaining ERG + ALL tokens)
    const changeAmount = totalInputValue - donationAmount - MIN_FEE;

    if (changeAmount > 0n || allTokens.size > 0) {
        const changeTokens = tokensToOutputFormat(allTokens);

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
// MAIN DONATION FUNCTION
// ===================================================================

/**
 * Main donation processing function
 */
async function processDonation(donationAmount) {
    if (donationInProgress) {
        showDonationStatus('Donation already in progress...', 'info');
        return;
    }
    
    donationInProgress = true;
    
    try {
        console.log('💖 Starting DONATION process');
        showDonationStatus('Preparing donation...', 'info');

        if (!walletConnector?.isConnected) {
            throw new Error('Wallet not connected');
        }

        if (!validateDonationAmount(donationAmount)) {
            throw new Error(`Invalid amount. Must be between ${DONATION_CONFIG.minAmount} and ${DONATION_CONFIG.maxAmount} ERG`);
        }

        // Check wallet balance
        const balance = await window.ergo.get_balance();
        const donationAmountERG = parseFloat(donationAmount);
        const requiredTotal = donationAmountERG + 0.001; // donation + fee
        const availableERG = Number(balance) / Number(NANOERGS_PER_ERG);
        
        if (availableERG < requiredTotal) {
            throw new Error(`Insufficient funds. Need ${requiredTotal.toFixed(3)} ERG, have ${availableERG.toFixed(3)} ERG`);
        }

        showDonationStatus('Building transaction...', 'info');

        // Build the transaction (always goes to donation address)
        const transaction = await buildDonationTransaction(donationAmountERG);

        showDonationStatus('Please approve the transaction in your wallet...', 'info');

        // Sign transaction
        let signedTransaction;
        try {
            signedTransaction = await window.ergo.sign_tx(transaction);
            
        } catch (signError) {
            if (signError.info === "User rejected." || signError.code === 2) {
                throw new Error('Transaction was cancelled by user');
            }
            
            throw new Error(`Transaction signing failed: ${signError.info || signError.message || 'Unknown error'}`);
        }

        // Submit transaction
        showDonationStatus('Submitting transaction to blockchain...', 'info');
        
        const txId = await window.ergo.submit_tx(signedTransaction);

        // This is always a donation transaction
        console.log('💖 Donation transaction submitted:', txId);

        // Success!
        showDonationStatus(`Donation successful! TX: ${txId.substring(0, 16)}...`, 'success');
        

        return txId;

    } catch (error) {
        console.error('Donation error:', error);
        
        let errorMessage = 'Donation failed: ';
        if (error.message.includes('cancelled') || error.message.includes('rejected')) {
            errorMessage += 'Transaction was cancelled by user';
        } else {
            errorMessage += error.message || 'Unknown error occurred';
        }
        
        showDonationStatus(errorMessage, 'error');
        throw error;
    } finally {
        donationInProgress = false;
    }
}

// ===================================================================
// UI FUNCTIONS
// ===================================================================

function showDonationStatus(message, type = 'info') {
    const existingStatus = document.querySelector('.donation-status');
    if (existingStatus) {
        existingStatus.remove();
    }

    const statusDiv = document.createElement('div');
    statusDiv.className = `donation-status ${type}`;
    statusDiv.textContent = message;
    document.body.appendChild(statusDiv);
    
    setTimeout(() => statusDiv.classList.add('show'), 100);
    
    const hideDelay = (type === 'info') ? 4000 : 6000;
    setTimeout(() => {
        statusDiv.classList.remove('show');
        setTimeout(() => statusDiv.remove(), 300);
    }, hideDelay);
}

function showDonationModal() {
    if (!walletConnector?.isConnected) {
        showDonationStatus('Please connect your wallet first', 'error');
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'donation-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'donation-modal';
    modal.innerHTML = `
        <div class="donation-modal-header">
            <h3>💖 Support Ergomempool</h3>
            <button class="modal-close">&times;</button>
        </div>
        <div class="donation-modal-content">
            <p>Help keep this project running by making a donation!</p>
            <div class="donation-amount-section">
                <label for="donation-amount">Donation Amount (ERG):</label>
                <input type="number" 
                       id="donation-amount" 
                       placeholder="${DONATION_CONFIG.defaultAmount}"
                       min="${DONATION_CONFIG.minAmount}"
                       max="${DONATION_CONFIG.maxAmount}"
                       step="0.1"
                       value="${DONATION_CONFIG.defaultAmount}">
                <div class="amount-buttons">
                    <button class="amount-btn" data-amount="0.5">0.5 ERG</button>
                    <button class="amount-btn" data-amount="1.0">1.0 ERG</button>
                    <button class="amount-btn" data-amount="5.0">5.0 ERG</button>
                    <button class="amount-btn" data-amount="10.0">10.0 ERG</button>
                </div>
            </div>
            <div class="donation-info">
                <p><strong>Recipient:</strong> ${DONATION_CONFIG.recipientAddress.substring(0, 20)}...</p>
                <p><small>Wallet will automatically handle fees and asset preservation.</small></p>
            </div>
            <div class="donation-modal-actions">
                <button class="donate-btn" id="confirm-donation">💝 Donate</button>
                <button class="cancel-btn" id="cancel-donation">Cancel</button>
            </div>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const closeModal = () => {
        document.body.removeChild(overlay);
    };
    
    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
    
    overlay.querySelectorAll('.amount-btn').forEach(button => {
        button.addEventListener('click', () => {
            const amount = button.getAttribute('data-amount');
            document.getElementById('donation-amount').value = amount;
        });
    });
    
    document.getElementById('cancel-donation').addEventListener('click', closeModal);
    
    document.getElementById('confirm-donation').addEventListener('click', async () => {
        const donateBtn = document.getElementById('confirm-donation');
        const originalText = donateBtn.textContent;
        
        try {
            donateBtn.disabled = true;
            donateBtn.textContent = 'Processing...';
            
            const amount = document.getElementById('donation-amount').value;
            
            if (!validateDonationAmount(amount)) {
                showDonationStatus(`Invalid amount. Please enter between ${DONATION_CONFIG.minAmount} and ${DONATION_CONFIG.maxAmount} ERG`, 'error');
                return;
            }
            
            closeModal();
            await processDonation(amount);
            
        } catch (error) {
            console.error('Modal donation error:', error);
        } finally {
            if (donateBtn && !donateBtn.closest('.donation-modal-overlay').parentNode) {
                donateBtn.disabled = false;
                donateBtn.textContent = originalText;
            }
        }
    });
    
    setTimeout(() => {
        overlay.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        document.getElementById('donation-amount').focus();
        document.getElementById('donation-amount').select();
    }, 100);
}

function initializeDonation() {
    const donationButton = document.getElementById('donation-button');
    if (donationButton) {
        donationButton.addEventListener('click', (e) => {
            e.preventDefault();
            showDonationModal();
        });
    } else {
        console.warn('Donation button not found');
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDonation);
} else {
    initializeDonation();
}