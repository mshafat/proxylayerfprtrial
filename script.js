async function generateLink() {
    const targetUrl = document.getElementById('targetUrl').value;
    const days = document.getElementById('days').value;
    const resultElement = document.getElementById('result');

    if (!targetUrl || !days) {
        alert("দয়া করে ইউআরএল এবং দিন সঠিকভাবে দিন।");
        return;
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(days));
    
    // URL এনকোড করা হচ্ছে
    const encodedUrl = btoa(targetUrl);
    const expiryTimestamp = expiryDate.getTime();

    // নেটল্লিফাই ফাংশনের পাথ
    const netlifyUrl = window.location.origin + `/.netlify/functions/proxy?site=${encodedUrl}&expires=${expiryTimestamp}`;

    resultElement.innerHTML = `
        <div style="padding: 15px; background: #e9ecef; border-radius: 5px;">
            <p style="margin: 0 0 10px 0;">আপনার ট্রায়াল লিংক:</p>
            <input type="text" value="${netlifyUrl}" id="finalLink" readonly>
            <button onclick="copyLink()" style="background: #007bff;">Copy Link</button>
            <p><small>মেয়াদ শেষ হবে: ${expiryDate.toLocaleString()}</small></p>
        </div>
    `;
}

function copyLink() {
    const copyText = document.getElementById("finalLink");
    copyText.select();
    navigator.clipboard.writeText(copyText.value);
    alert("লিংকটি কপি করা হয়েছে!");
}
