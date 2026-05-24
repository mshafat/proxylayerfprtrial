async function generateLink() {
    const targetUrl = document.getElementById('targetUrl').value;
    const days = document.getElementById('days').value;
    const contactInfo = document.getElementById('contactInfo').value || "your email/phone";
    const mode = document.querySelector('input[name="trialMode"]:checked').value;
    const resultElement = document.getElementById('result');

    if (!targetUrl || !days) {
        alert("Please enter both the URL and the trial duration.");
        return;
    }

    const encodedUrl = btoa(targetUrl);
    const encodedContact = btoa(contactInfo);
    
    let netlifyUrl = window.location.origin + `/.netlify/functions/proxy?site=${encodedUrl}&contact=${encodedContact}&mode=${mode}`;

    if (mode === 'fixed') {
        // Fixed mode এর জন্য এখনই তারিখ হিসাব করে পাঠানো হচ্ছে
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + parseInt(days));
        netlifyUrl += `&expires=${expiryDate.getTime()}`;
    } else {
        // Evergreen mode এর জন্য শুধু দিনের সংখ্যা পাঠানো হচ্ছে
        netlifyUrl += `&duration=${days}`;
    }

    resultElement.innerHTML = `
        <div style="padding: 15px; background: #e9ecef; border-radius: 5px; margin-top: 20px;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">Your ${mode === 'fixed' ? 'Fixed' : 'Evergreen'} Trial Link:</p>
            <input type="text" value="${netlifyUrl}" id="finalLink" readonly style="width: 100%; margin-bottom: 10px; padding: 8px;">
            <button onclick="copyLink()" style="background: #007bff;">Copy Link</button>
        </div>
    `;
}

function copyLink() {
    const copyText = document.getElementById("finalLink");
    copyText.select();
    navigator.clipboard.writeText(copyText.value);
    alert("Trial link copied to clipboard!");
}
