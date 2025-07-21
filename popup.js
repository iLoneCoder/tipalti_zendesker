document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('extensionForm');
    const statusDiv = document.getElementById('status');
    
    // Load current tab info
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        if (currentTab.url.includes('tipalti.zendesk.com/agent/tickets/')) {
            // Extract ticket ID from URL
            const ticketMatch = currentTab.url.match(/tickets\/(\d+)/);
            if (ticketMatch) {
                document.getElementById('ticketId').value = ticketMatch[1];
            }
        }
    });


    form.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log("Popup script loaded");
        const formData = {
            ticketId: document.getElementById('ticketId').value,
            // action: document.getElementById('action').value,
            // notes: document.getElementById('notes').value
        };

        // Validate form
        if (!formData.ticketId) {
            showStatus('Please enter a ticket ID', 'error');
            return;
        }
        
        // Send message to content script to get page data
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: "GET_TICKET_DATA",
                // formData
            }, function(response) {
                
                // Check for connection errors
                if (chrome.runtime.lastError) {
                    console.error('Runtime error:', chrome.runtime.lastError);
                    showStatus('Failed to connect to page. Make sure you are on a Zendesk ticket page.', 'error');
                    return;
                }

                if (!response.success) {
                    showStatus('Failed to retrieve ticket data', 'error');
                    return
                }

                
                // send request to FAST API
                const payload = {
                    ticket_id: formData.ticketId,
                    customer_name: response.data.requester,
                    customer_org: response.data.organisation,
                    conversation: response.data.conversation,
                    internal_notes: response.data.internalNotes,
                    environment: {
                        browser: "chrome",
                        os: "windows"
                    }
                };
                
                console.log("Response from content script:", payload);
            })
        })

        

    });


    // type: error, success
    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }


    
});