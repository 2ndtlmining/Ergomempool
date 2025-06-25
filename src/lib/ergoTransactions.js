// ergoTransactions.js - Real Ergo transaction building (ported from Flask)

// Ergo protocol constants
const NANOERGS_PER_ERG = 1000000000n;
const MIN_FEE = 1000000n; // 0.001 ERG minimum fee
const FEE_ERGOTREE = "1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304";

/**
 * Convert ERG to nanoERG
 */
export function ergToNanoErg(ergAmount) {
    return (BigInt(Math.floor(parseFloat(ergAmount) * Number(NANOERGS_PER_ERG)))).toString();
}

/**
 * Validate transaction amount
 */
export function validateTransactionAmount(amount, minAmount = "0.001", maxAmount = "100.0") {
    const ergAmount = parseFloat(amount);
    return !isNaN(ergAmount) && 
           ergAmount >= parseFloat(minAmount) && 
           ergAmount <= parseFloat(maxAmount);
}

/**
 * Decodes a base58 address (ported from your Flask code)
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
 * Converts Ergo address to ErgoTree (ported from your Flask code)
 */
export function addressToErgoTree(address) {
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

        // Hardcoded fallback for donation address (from your Flask code)
        if (address === "9hF8coEmr6Mnfh3gexuwnnU816kbW8qrVBoUraJC5Zb79T9DRnx") {
            return "0008cd027ecf12ead2d42ab4ede6d6faf6f1fb0f2af84ee66a1a8be2f426b6bc2a2cccd4b";
        }

        throw error;
    }
}

/**
 * Selects UTXOs to cover required amount and collects all tokens (ported from your Flask code)
 */
export function selectInputsAndTokens(utxos, requiredAmount) {
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
 * Converts token map to output format (ported from your Flask code)
 */
export function tokensToOutputFormat(tokenMap) {
    return Array.from(tokenMap.entries()).map(([tokenId, amount]) => ({
        tokenId,
        amount: amount.toString()
    }));
}

/**
 * Builds a real Ergo transaction according to protocol (ported from your Flask code)
 */
export async function buildErgoTransaction(amountERG, recipientAddress, transactionType = 'test') {
    // Check wallet connection
    if (typeof window === 'undefined' || !window.ergo) {
        throw new Error('Wallet not connected');
    }

    // Convert amount to nanoERGs
    const transactionAmount = BigInt(Math.floor(amountERG * Number(NANOERGS_PER_ERG)));
    const totalRequired = transactionAmount + MIN_FEE;

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
    const recipientErgoTree = addressToErgoTree(recipientAddress);
    const changeErgoTree = addressToErgoTree(changeAddress);

    // Verify addresses are different
    if (recipientErgoTree === changeErgoTree) {
        throw new Error('Recipient and change addresses cannot be the same');
    }

    // Build outputs
    const outputs = [];

    // OUTPUT 1: Main transaction (pure ERG, no tokens)
    outputs.push({
        value: transactionAmount.toString(),
        ergoTree: recipientErgoTree,
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
    const changeAmount = totalInputValue - transactionAmount - MIN_FEE;

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

    // Critical balance verification (from your Flask code)
    const totalOutputValue = outputs.reduce((sum, output) => sum + BigInt(output.value), 0n);
    if (totalInputValue !== totalOutputValue) {
        throw new Error(`Balance mismatch! Inputs: ${Number(totalInputValue)} ≠ Outputs: ${Number(totalOutputValue)}`);
    }

    console.log(`✅ Built ${transactionType} transaction:`, {
        amount: amountERG,
        recipient: recipientAddress.substring(0, 20) + '...',
        inputs: selectedInputs.length,
        outputs: outputs.length,
        totalValue: Number(totalInputValue) / Number(NANOERGS_PER_ERG)
    });

    return transaction;
}

/**
 * Main transaction processing function (ported from your Flask code)
 */
export async function processErgoTransaction(amount, recipientAddress, transactionType = 'test') {
    try {
        console.log(`🚀 Starting ${transactionType.toUpperCase()} transaction process`);

        // Validate inputs
        if (!validateTransactionAmount(amount)) {
            throw new Error(`Invalid amount. Must be between 0.001 and 100.0 ERG`);
        }

        // Check wallet balance
        const balance = await window.ergo.get_balance();
        const amountERG = parseFloat(amount);
        const requiredTotal = amountERG + 0.001; // amount + fee
        const availableERG = Number(balance) / Number(NANOERGS_PER_ERG);
        
        if (availableERG < requiredTotal) {
            throw new Error(`Insufficient funds. Need ${requiredTotal.toFixed(3)} ERG, have ${availableERG.toFixed(3)} ERG`);
        }

        // Build the transaction
        const transaction = await buildErgoTransaction(amountERG, recipientAddress, transactionType);

        console.log(`📝 Transaction built, requesting wallet signature...`);

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

        console.log(`📡 Submitting transaction to blockchain...`);

        // Submit transaction
        const txId = await window.ergo.submit_tx(signedTransaction);

        console.log(`✅ ${transactionType} transaction successful:`, txId);

        return txId;

    } catch (error) {
        console.error(`❌ ${transactionType} transaction error:`, error);
        throw error;
    }
}