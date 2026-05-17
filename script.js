async function generateLink() {
    const targetUrl = document.getElementById('targetUrl').value;
    const days = document.getElementById('days').value;
    const contactInfo = document.getElementById('contactInfo').value || "your email/phone";
    const resultElement = document.getElementById('result');

    if (!targetUrl || !days) {
        alert("Please enter both the URL and the trial duration.");
        return;
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(days));
    
    // Encoding URL and Contact Info to pass safely in URL params
    const encodedUrl = btoa(targetUrl);
    const encodedContact = btoa(contactInfo);
    const expiryTimestamp = expiryDate.getTime();

    // Generating Netlify function URL
    const netlifyUrl = window.location.origin + `/.netlify/functions/proxy?site=${encodedUrl}&expires=${expiryTimestamp}&contact=${encodedContact}`;

    resultElement.innerHTML = `
        <div style="padding: 15px; background: #e9ecef; border-radius: 5px; margin-top: 20px;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">Your Trial Link is Ready:</p>
            <input type="text" value="${netlifyUrl}" id="finalLink" readonly style="width: 100%; margin-bottom: 10px; padding: 8px;">
            <button onclick="copyLink()" style="background: #007bff;">Copy Link</button>
            <p style="margin-top: 10px;"><small>Will expire on: ${expiryDate.toLocaleString()}</small></p>
        </div>
    `;
}

function copyLink() {
    const copyText = document.getElementById("finalLink");
    copyText.select();
    navigator.clipboard.writeText(copyText.value);
    alert("Trial link copied to clipboard!");
}
