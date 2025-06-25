// Transaction type detection and special transaction tracking
const TRANSACTION_TYPES = {
    DONATION: {
        icon: '💖',
        color: '#e74c3c',
        addresses: ['9hF8coEmr6Mnfh3gexuwnnU816kbW8qrVBoUraJC5Zb79T9DRnx']
    },
    TEST: {
        icon: '🧪',
        color: '#f39c12',
    },
    REGULAR: {
        icon: '',
        color: null
    }
};

// Track special transactions
let testTransactionIds = new Set();
let donationTransactionIds = new Set();

export function trackSpecialTransaction(txId, type = 'test') {
    if (type === 'test') {
        testTransactionIds.add(txId);
        console.log(`🧪 Registered test transaction: ${txId}`);
    } else if (type === 'donation') {
        donationTransactionIds.add(txId);
        console.log(`💖 Registered donation transaction: ${txId}`);
    }
}

export function identifyTransactionType(transaction) {
    // Check test transactions first
    if (testTransactionIds.has(transaction.id)) {
        console.log('✅ Identified as TEST transaction:', transaction.id);
        return TRANSACTION_TYPES.TEST;
    }
    
    // Check donation transactions
    if (donationTransactionIds.has(transaction.id)) {
        console.log('✅ Identified as DONATION transaction:', transaction.id);
        return TRANSACTION_TYPES.DONATION;
    }
    
    // Check if any output goes to donation address
    if (transaction.outputs && transaction.outputs.length > 0) {
        for (const output of transaction.outputs) {
            if (output.address && TRANSACTION_TYPES.DONATION.addresses.includes(output.address)) {
                console.log('✅ Identified as DONATION transaction by address:', transaction.id);
                return TRANSACTION_TYPES.DONATION;
            }
        }
    }
    
    return TRANSACTION_TYPES.REGULAR;
}

export { TRANSACTION_TYPES };