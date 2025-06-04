import axios from 'axios';

// Centralized API calls
export async function fetchTransactions() {
    try {
        const response = await axios.get('/api?endpoint=transactions');
        return response.data;
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
}

export async function fetchBlocks() {
    try {
        const response = await axios.get('/api?endpoint=blocks');
        return response.data;
    } catch (error) {
        console.error('Error fetching blocks:', error);
        return [];
    }
}

export async function fetchPrice() {
    try {
        const response = await axios.get('/api?endpoint=price');
        return response.data;
    } catch (error) {
        console.error('Error fetching price:', error);
        return { price: 1.0, currency: 'USD' };
    }
}

// Function to add USD values to transactions
export function addUsdValues(transactions, ergPrice) {
    return transactions.map(tx => ({
        ...tx,
        usd_value: (tx.value || 0) * ergPrice
    }));
}