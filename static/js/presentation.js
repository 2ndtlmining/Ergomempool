// presentation.js - Handle ErgoHack 10 Presentation link

document.addEventListener('DOMContentLoaded', function() {
    const presentationLink = document.getElementById('presentation-footer-link');
    
    if (presentationLink) {
        presentationLink.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default link behavior
            
            // Define the presentation URL
            // Option 1: If you host the HTML file in your static folder
            const presentationUrl = '/static/ergohack10-presentation.html';
            
            // Option 2: If you add a Flask route (see app.py changes below)
            // const presentationUrl = '/presentation';
            
            // Option 3: If you host it externally
            // const presentationUrl = 'https://yourdomain.com/ergohack10-presentation.html';
            
            // Open in new tab with proper security
            const newWindow = window.open(presentationUrl, '_blank', 'noopener,noreferrer');
            
            // Fallback for popup blockers
            if (!newWindow) {
                alert('Please allow popups for this site to view the presentation, or navigate to: ' + presentationUrl);
                return;
            }
            
            // Add visual feedback - button press effect
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
            
            // Optional: Track presentation views (you can add analytics here)
            console.log('ErgoHack 10 Presentation opened');
        });
        
        // Add keyboard accessibility
        presentationLink.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    }
});