# Ergomempool

Ergomempool is a real-time web application that provides comprehensive monitoring and visualization of the Ergo blockchain mempool, blocks, and mining activity.

## 🚀 Features

### Real-time Mempool Visualization
- Interactive grid visualization of unconfirmed transactions
- Color-coded squares by transaction size or value
- Transaction details on hover with USD conversion
- Support for up to 500 transactions in the visualization

### Live Block Monitoring
- Display of the last 4 mined blocks with detailed information
- Real-time "Next Block" estimation showing pending transactions
- Block size, total rewards (base + fees), and transaction count
- Mining pool identification with logos and names
- Clickable block heights linking to block explorer

### Wallet Integration
- Connect Ergo wallets (Nautilus, Eternl, Minotaur)
- Highlight your own transactions in the mempool
- Send test transactions with custom amounts
- Donation functionality built-in

### Mining Pool Tracking
- Recognition of major Ergo mining pools
- Pool logos and human-readable names
- Mining pool performance tracking

## 📊 Data Refresh Intervals

The application automatically updates data at different intervals optimized for each data type:

- **Mempool Transactions**: Every 30 seconds
- **Block Information**: Every 30 seconds  
- **ERG Price Data**: Every 5 minutes

These intervals provide real-time feel while being respectful of API rate limits.

## 🎯 Use Cases

- **Miners**: Monitor mempool size and fee trends
- **Traders**: Track large transactions and market activity
- **Developers**: Analyze transaction patterns and network activity
- **Users**: Check transaction status and network congestion
- **Mining Pools**: Monitor competition and block discovery

## 🛠 Technical Details

### APIs Used
- **Ergo Platform API**: `https://api.ergoplatform.com/`
  - Unconfirmed transactions endpoint
  - Block data and mining information
- **Spire Pools Oracle**: ERG-USD price data
- **Sigmaspace Block Explorer**: Block and transaction links

### Data Sources
- Fetches up to 99,999 unconfirmed transactions (sorted by size)
- Retrieves last 4 blocks with complete transaction details
- Real-time price data from Ergo oracle network

### Performance
- Client-side visualization limiting to 500 transactions for optimal performance
- Efficient caching of price data to reduce API calls
- Responsive design supporting desktop and mobile devices

## 🚀 Deployment Instructions

### Prerequisites
- Python 3.7+
- pip package manager

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/2ndtlmining/Ergomempool.git
   cd Ergomempool
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the application:
   ```bash
   python app.py
   ```

4. Access the application in your web browser at `http://localhost:5000`

### Production Deployment
For production deployment, consider:
- Using a WSGI server like Gunicorn
- Setting up reverse proxy with Nginx
- Configuring environment variables for API endpoints
- Implementing proper logging and monitoring

## 🔧 Configuration

### Mining Pool Recognition
- Edit `miner_names.json` to add/update mining pool names
- Edit `miner_logos.json` to add/update mining pool logos
- Logos should be placed in `/static/logos/` directory

### Refresh Intervals
To modify data refresh rates, edit `main.js`:
```javascript
// Change transaction/block refresh (currently 30 seconds)
setInterval(() => {
    loadTransactions();
    loadBlockLabels();
}, 30000); // Change this value

// Change price refresh (currently 5 minutes)  
setInterval(() => {
    loadPrice();
}, 300000); // Change this value
```

## 🎨 Features in Detail

### Mempool Visualizer
- Grid layout with each square representing a transaction
- Two color modes: by transaction size or by ERG value
- Hover tooltips showing transaction ID, size, and value
- Click to open transaction in block explorer
- Special highlighting for wallet transactions

### Block Animation
- Smooth transitions when new blocks are mined
- Visual feedback for block confirmations
- Time-ago indicators for block mining times

### Wallet Features
- Non-custodial wallet connection
- Transaction signing and broadcasting
- Test transaction functionality for development
- Secure donation processing

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is open source. Please check the repository for license details.

## 🔗 Links

- **Live Application**: [Ergomempool](https://ergomempool.com) *(if hosted)*
- **Ergo Platform**: [ergoplatform.org](https://ergoplatform.org)
- **Block Explorer**: [sigmaspace.io](https://sigmaspace.io)

## 📞 Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Contact: *(add your preferred contact method)*

---

*Built for the Ergo community with ❤️*