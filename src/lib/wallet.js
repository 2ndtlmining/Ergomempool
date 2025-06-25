import { walletConnector } from './stores.js';

// Ergo Wallet Connector Class (simplified for SvelteKit)
class ErgoWalletConnector {
    constructor() {
        this.connectedWallet = null;
        this.isConnected = false;
        this.connectedAddress = null;
    }

    async detectWallets() {
        const wallets = [];
        
        if (typeof window !== 'undefined' && window.ergoConnector) {
            if (window.ergoConnector.nautilus) {
                wallets.push({ name: 'Nautilus', api: window.ergoConnector.nautilus });
            }
            if (window.ergoConnector.eternl) {
                wallets.push({ name: 'Eternl', api: window.ergoConnector.eternl });
            }
            if (window.ergoConnector.minotaur) {
                wallets.push({ name: 'Minotaur', api: window.ergoConnector.minotaur });
            }
        }
        
        return wallets;
    }

    async connectWallet() {
        try {
            const wallets = await this.detectWallets();
            
            if (wallets.length === 0) {
                throw new Error('No Ergo wallets detected. Please install Nautilus, Eternl, or Minotaur wallet.');
            }

            // For simplicity, connect to first available wallet
            const wallet = wallets[0];
            const access = await wallet.api.connect();
            
            if (access) {
                this.connectedWallet = { name: wallet.name };
                this.isConnected = true;
                this.connectedAddress = await this.getAddress();
                
                // Update store
                walletConnector.set({
                    isConnected: true,
                    connectedAddress: this.connectedAddress,
                    connectedWallet: this.connectedWallet
                });
                
                return this.connectedWallet;
            }
            
            throw new Error('Failed to connect to wallet');
            
        } catch (error) {
            throw error;
        }
    }

    async getAddress() {
        if (!this.isConnected) {
            throw new Error('Wallet not connected');
        }

        try {
            const address = await window.ergo.get_change_address();
            return address || 'No address found';
        } catch (error) {
            throw new Error('Failed to get address: ' + error.message);
        }
    }

    async getBalance() {
        if (!this.isConnected) {
            throw new Error('Wallet not connected');
        }

        try {
            const balance = await window.ergo.get_balance();
            return (parseInt(balance) / 1000000000).toFixed(3);
        } catch (error) {
            throw new Error('Failed to get balance: ' + error.message);
        }
    }

    disconnect() {
        this.connectedWallet = null;
        this.isConnected = false;
        this.connectedAddress = null;
        
        walletConnector.set({
            isConnected: false,
            connectedAddress: null,
            connectedWallet: null
        });
    }
}

// Export singleton instance
export const walletConnection = new ErgoWalletConnector();

// Utility functions for transaction detection
export function isWalletTransaction(transaction, walletAddress) {
    if (!walletAddress || !transaction) return false;
    
    const inputMatch = transaction.inputs && transaction.inputs.some(input => 
        input.address === walletAddress
    );
    
    const outputMatch = transaction.outputs && transaction.outputs.some(output => 
        output.address === walletAddress
    );
    
    return inputMatch || outputMatch;
}