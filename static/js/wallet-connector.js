// wallet-connector.js - Ergo Wallet Integration

// Ergo Wallet Connector Class
class ErgoWalletConnector {
    constructor() {
        this.connectedWallet = null;
        this.isConnected = false;
        this.connectedAddress = null;
    }

    async detectWallets() {
        const wallets = [];
        
        if (window.ergoConnector) {
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

            if (wallets.length > 1) {
                const selectedWallet = await this.showWalletSelectionModal(wallets);
                if (!selectedWallet) {
                    throw new Error('No wallet selected');
                }
                
                const access = await selectedWallet.api.connect();
                if (access) {
                    this.connectedWallet = { name: selectedWallet.name };
                    this.isConnected = true;
                    this.connectedAddress = await this.getAddress();
                    return this.connectedWallet;
                }
            } else {
                const wallet = wallets[0];
                const access = await wallet.api.connect();
                if (access) {
                    this.connectedWallet = { name: wallet.name };
                    this.isConnected = true;
                    this.connectedAddress = await this.getAddress();
                    return this.connectedWallet;
                }
            }
            
            throw new Error('Failed to connect to wallet');
            
        } catch (error) {
            throw error;
        }
    }

    showWalletSelectionModal(wallets) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'wallet-modal-overlay';
            
            const modal = document.createElement('div');
            modal.className = 'wallet-modal';
            modal.innerHTML = `
                <div class="wallet-modal-header">
                    <h3>Select Wallet</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="wallet-modal-content">
                    <p>Choose which wallet you'd like to connect:</p>
                    <div class="wallet-options">
                        ${wallets.map(wallet => `
                            <button class="wallet-option" data-wallet="${wallet.name}">
                                <img src="/static/wallet/ergo-wallet-white.png" alt="${wallet.name}" class="wallet-option-icon">
                                <span>${wallet.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
            
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            const closeModal = () => {
                document.body.removeChild(overlay);
                resolve(null);
            };
            
            overlay.querySelector('.modal-close').addEventListener('click', closeModal);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal();
            });
            
            overlay.querySelectorAll('.wallet-option').forEach(button => {
                button.addEventListener('click', () => {
                    const walletName = button.getAttribute('data-wallet');
                    const selectedWallet = wallets.find(w => w.name === walletName);
                    document.body.removeChild(overlay);
                    resolve(selectedWallet);
                });
            });
            
            setTimeout(() => {
                overlay.classList.add('show');
            }, 10);
        });
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

    disconnect() {
        this.connectedWallet = null;
        this.isConnected = false;
        this.connectedAddress = null;
        if (window.ergo) {
            console.log('Wallet disconnected');
        }
    }
}

// Helper functions for wallet integration
function showWalletStatus(message, type = 'info') {
    const existingStatus = document.querySelector('.wallet-status');
    if (existingStatus) {
        existingStatus.remove();
    }

    const statusDiv = document.createElement('div');
    statusDiv.className = `wallet-status ${type}`;
    statusDiv.textContent = message;
    document.body.appendChild(statusDiv);
    
    setTimeout(() => statusDiv.classList.add('show'), 100);
    
    setTimeout(() => {
        statusDiv.classList.remove('show');
        setTimeout(() => statusDiv.remove(), 300);
    }, 4000);
}

function showWalletInfo(info) {
    const existingInfo = document.querySelector('.wallet-info-display');
    if (existingInfo) {
        existingInfo.remove();
    }

    if (!info) return;

    const walletInfoDiv = document.createElement('div');
    walletInfoDiv.className = 'wallet-info-display';
    walletInfoDiv.innerHTML = `
        <div class="wallet-content">
            <strong>${info.name} Connected</strong>
            <div class="balance">Balance: ${info.balance} ERG</div>
            <div class="address">${info.address.substring(0, 20)}...</div>
        </div>
        <div class="wallet-disconnect" style="display: none;">
            <button class="disconnect-btn">Disconnect</button>
        </div>
    `;

    walletInfoDiv.addEventListener('click', function(e) {
        if (e.target.classList.contains('disconnect-btn')) {
            walletConnector.disconnect();
            document.getElementById('connect-button').innerHTML = `
                <img src="/static/wallet/ergo-wallet-white.png" alt="Ergo Wallet" class="wallet-icon">
                Connect Wallet
            `;
            document.getElementById('connect-button').classList.remove('connected');
            showWalletInfo(null);
            showWalletStatus('Wallet disconnected', 'info');
            return;
        }

        const disconnectDiv = this.querySelector('.wallet-disconnect');
        const content = this.querySelector('.wallet-content');
        
        if (disconnectDiv.style.display === 'none') {
            disconnectDiv.style.display = 'block';
            content.style.opacity = '0.7';
            this.classList.add('expanded');
        } else {
            disconnectDiv.style.display = 'none';
            content.style.opacity = '1';
            this.classList.remove('expanded');
        }
    });

    const walletSection = document.querySelector('.wallet-section');
    walletSection.appendChild(walletInfoDiv);
}

function isWalletTransaction(transaction, walletAddress) {
    if (!walletAddress || !transaction) return false;
    
    const inputMatch = transaction.inputs && transaction.inputs.some(input => 
        input.address === walletAddress
    );
    
    const outputMatch = transaction.outputs && transaction.outputs.some(output => 
        output.address === walletAddress
    );
    
    return inputMatch || outputMatch;
}

// Initialize wallet connector instance
const walletConnector = new ErgoWalletConnector();

// Wallet connection event handler function
function initializeWalletConnection() {
    const connectButton = document.getElementById('connect-button');
    
    connectButton.addEventListener('click', async function() {
        if (walletConnector.isConnected) {
            walletConnector.disconnect();
            this.innerHTML = `
                <img src="/static/wallet/ergo-wallet-white.png" alt="Ergo Wallet" class="wallet-icon">
                Connect Wallet
            `;
            this.classList.remove('connected');
            showWalletInfo(null);
            showWalletStatus('Wallet disconnected', 'info');
        } else {
            try {
                this.innerHTML = `
                    <img src="/static/wallet/ergo-wallet-white.png" alt="Ergo Wallet" class="wallet-icon">
                    Connecting...
                `;
                this.disabled = true;
                
                showWalletStatus('Connecting to wallet...', 'info');
                
                const wallet = await walletConnector.connectWallet();
                const address = await walletConnector.getAddress();
                const balance = await walletConnector.getBalance();
                
                this.innerHTML = `
                    <img src="/static/wallet/ergo-wallet-white.png" alt="Ergo Wallet" class="wallet-icon">
                    Disconnect
                `;
                this.classList.add('connected');
                
                showWalletInfo({
                    name: wallet.name,
                    address: address,
                    balance: balance
                });
                
                showWalletStatus(`Successfully connected to ${wallet.name}!`, 'success');
                
            } catch (error) {
                showWalletStatus('Failed to connect: ' + error.message, 'error');
                console.error('Wallet connection error:', error);
            } finally {
                this.disabled = false;
                if (!walletConnector.isConnected) {
                    this.innerHTML = `
                        <img src="/static/wallet/ergo-wallet-white.png" alt="Ergo Wallet" class="wallet-icon">
                        Connect Wallet
                    `;
                }
            }
        }
    });

    // Check for wallet availability on page load
    setTimeout(async () => {
        const wallets = await walletConnector.detectWallets();
        if (wallets.length === 0) {
            connectButton.title = 'No Ergo wallets detected. Please install Nautilus, Eternl, or Minotaur.';
            connectButton.style.opacity = '0.7';
        } else {
            connectButton.title = `Connect to your Ergo wallet (${wallets.map(w => w.name).join(', ')} detected)`;
        }
    }, 1000);
}