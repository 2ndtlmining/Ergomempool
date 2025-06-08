<script>
    import { walletConnector } from '$lib/stores.js';
    
    function handleDonation() {
        // Check wallet connection before triggering
        if (!$walletConnector.isConnected) {
            showWalletWarning('⚠️ Please connect your wallet first to make donations');
            return;
        }
        
        // Trigger donation modal from Header component
        if (typeof window !== 'undefined' && window.triggerDonation) {
            window.triggerDonation();
        } else {
            console.log('💖 Donation functionality not available yet');
        }
    }
    
    function handlePresentation() {
        console.log('📺 Presentation clicked');
        // You can replace this with your actual presentation URL
        const presentationUrl = '#'; // Replace with your ErgoHack 10 presentation URL
        
        if (presentationUrl !== '#') {
            window.open(presentationUrl, '_blank');
        } else {
            alert('Presentation URL not configured yet. Please add your ErgoHack 10 presentation link!');
        }
    }
    
    function showWalletWarning(message) {
        // Create status notification matching the header style
        const statusDiv = document.createElement('div');
        statusDiv.className = 'wallet-status warning show';
        statusDiv.textContent = message;
        document.body.appendChild(statusDiv);
        
        setTimeout(() => {
            statusDiv.classList.remove('show');
            setTimeout(() => statusDiv.remove(), 300);
        }, 4000);
    }
</script>

<footer class="footer">
    <div class="footer-content">
        <a 
            href="https://github.com/2ndtlmining/Ergomempool" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="github-link" 
            title="View source code on GitHub"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span>v.0.0.7</span>
        </a>
        <button 
            class="donation-link" 
            class:wallet-required={!$walletConnector.isConnected}
            title={$walletConnector.isConnected ? "Support the project with a donation" : "Connect wallet to make donations"}
            on:click={handleDonation}
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span>Donate</span>
        </button>
    </div>
</footer>

<style>
    .donation-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--light-orange);
        background: none;
        border: 2px solid transparent;
        padding: 10px 15px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s ease;
        text-decoration: none;
    }
    
    .donation-link:hover {
        color: white;
        background-color: rgba(230, 126, 34, 0.2);
        border-color: var(--primary-orange);
        transform: translateY(-2px);
    }
    
    /* Wallet required styling */
    .donation-link.wallet-required {
        opacity: 0.7;
        position: relative;
    }
    
    .donation-link.wallet-required::after {
        position: absolute;
        top: 2px;
        right: 2px;
        font-size: 12px;
        color: var(--primary-orange);
        text-shadow: 0 0 3px rgba(230, 126, 34, 0.5);
    }
    
    .donation-link:hover svg {
        transform: scale(1.2);
        animation: heartbeat 1s ease-in-out infinite;
    }
    
    @keyframes heartbeat {
        0% { transform: scale(1.2); }
        50% { transform: scale(1.4); }
        100% { transform: scale(1.2); }
    }
</style>