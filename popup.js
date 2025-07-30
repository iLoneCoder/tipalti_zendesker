document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('extensionForm');
    const statusDiv = document.getElementById('status');
    
    // Load saved token from storage
    chrome.storage.sync.get(["savedToken"], function(data) {
        if (data.savedToken) {
            document.getElementById("token").value = data.savedToken
        }
    })

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
            token: document.getElementById('token').value,
            // action: document.getElementById('action').value,
            // notes: document.getElementById('notes').value
        };

        // Validate form
        if (!formData.ticketId) {
            showStatus('Please enter a ticket ID', 'error');
            return;
        }

        if (!formData.token) {
            showStatus('Please enter a token', 'error');
            return;
        } else {
            // Save token to storage
            chrome.storage.sync.set({savedToken: formData.token}, function() {
                console.log('Token saved:', formData.token);
            });
        }


        
        // Send message to content script to get page data
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: "GET_TICKET_DATA",
                // formData
            }, async function(response) {
                
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
                    token: formData.token,
                    customer_name: response.data.requester,
                    customer_org: response.data.organisation,
                    conversation: response.data.conversation,
                    internal_notes: response.data.internalNotes,
                    environment: {
                        browser: "chrome",
                        os: "windows"
                    }
                };
                
                // console.log("Response from content script:", payload);

                try {
                    const button = document.querySelector('button[type="submit"]');
                    button.disabled = true; // Disable button to prevent multiple clicks
                    button.textContent = 'Loading...';

                    const data = await sendDataToGleanAgentAPI(payload)
                    const responseMessage = data.messages[1].content[0].text;

                    showStatus(responseMessage, 'success');
                    button.disabled = false;
                    button.textContent = 'Execute';

                } catch (error) {
                    console.error('Error sending data to Glean Agent API:', error);
                    showStatus('Failed to send data to Glean Agent API', 'error');
                    return;
                }
   
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
        }, 7000);
    }


    
});


async function sendDataToGleanAgentAPI(payload) {

    const data = {
        agent_id: "ffbd6b45b6484ad9a1f6ca01a7d5858a",
        input: {
            issue_description: payload.conversation
        },
        messages: [
            {
                role: "USER",
                content: [
                    {
                        text: "string",
                        type: "text"
                    }
            ]
            }
        ],
        metadata: {}
    }
    
    
    const response = await fetch(`https://tipalti2-be.glean.com/rest/api/v1/agents/runs/wait`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${payload.token}`
        },
        body: JSON.stringify(data)
    })

    if (!response.ok) {
        console.error('Failed to send data to Glean Agent API:', response.statusText);
    }

    const responseData = await response.json();
    
    return responseData


}