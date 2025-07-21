// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === "GET_TICKET_DATA") {
        console.log("Received request for ticket data:", sender);
        const organisation = getOrganisation();
        const requester = getRequester();
        const {conversation, internalNotes} = getTicketContent()
        console.log("Organisation:", organisation);
        console.log("Requester:", requester);
        console.log("Conversation:", conversation);
        console.log("Internal Notes:", internalNotes);
        
        sendResponse({
            success: true,
            data: {
                organisation,
                requester,
                conversation,
                internalNotes
            }
        });
    }
})


// Getting organisaion
function getOrganisation() {
    const element = document.querySelector(".ember-view.btn.organization-pill")
    console.log({element})
    const org_name = element ? element.textContent.trim() : ''        
    
    return org_name
}

// get requester
function getRequester() {
    const elements = document.querySelectorAll(".StyledEllipsis-sc-1u4uqmy-0.eRAXfm")
    if (elements.length >= 2) {
        const requester = elements[1].textContent.trim();
        return requester;
    }

    return ""
}

function getTicketContent() {
    // Get client text
    // message node: sc-19le1gu-1
    // conversation: zd-comment
    // internall notes: sc-rgtb9i-0 fzCTsb
    let conversation = ""
    let internalNotes = ""

    // find all message nodes
    const conversationElements = document.querySelectorAll(".sc-19le1gu-1");
    for (const element of conversationElements) {
        console.log("Element:", element);

        // check if it is internal note
        if (element.querySelector(".sc-rgtb9i-0.fzCTsb")) {
            internalNotes += element.textContent.trim() + ";"
            continue
        }

        // if it is not internal note, it is a conversation message
        if (element.querySelector(".zd-comment")) {
            // check if it is a comment
            conversation += element.textContent.trim() + ";"
        }
    }

    return {conversation, internalNotes}
}
