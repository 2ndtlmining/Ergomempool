// Updated src/lib/api.js - Fixed networking for Docker
import axios from 'axios';

// Configure axios with relative URLs to avoid 0.0.0.0:5173 errors
const api = axios.create({
    baseURL: '', // Use relative URLs
    timeout: 10000,
});

// Centralized API calls with proper error handling
export async function fetchTransactions() {
    try {
        const response = await api.get('/api?endpoint=transactions');
        return response.data;
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
}

export async function fetchBlocks() {
    try {
        const response = await api.get('/api?endpoint=blocks');
        return response.data;
    } catch (error) {
        console.error('Error fetching blocks:', error);
        return [];
    }
}

export async function fetchPrice() {
    try {
        const response = await api.get('/api?endpoint=price');
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