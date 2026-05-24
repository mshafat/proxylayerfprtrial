function handleDurationChange() {
    const preset = document.getElementById('durationPreset').value;
    const customDaysInput = document.getElementById('customDaysInput');
    const customDateInput = document.getElementById('customDateInput');
    const evergreenMode = document.getElementById('evergreenMode');
    const evergreenLabel = document.getElementById('evergreenModeLabel');
    const fixedMode = document.getElementById('fixedMode');

    customDaysInput.style.display = 'none';
    customDateInput.style.display = 'none';

    evergreenMode.disabled = false;
    evergreenLabel.classList.remove('disabled-mode');

    if (preset === 'custom-days') {
        customDaysInput.style.display = 'block';
    } else if (preset === 'custom-date') {
        customDateInput.style.display = 'block';
        fixedMode.checked = true;
        evergreenMode.disabled = true;
        evergreenLabel.classList.add('disabled-mode');
    }
}

function handleDateInputChange() {
    const evergreenMode = document.getElementById('evergreenMode');
    const fixedMode = document.getElementById('fixedMode');
    fixedMode.checked = true;
    evergreenMode.disabled = true;
}

// এক্সপায়ারড লিংক থেকে ডেটা রিকভার করার ফাংশন
function parseExpiredLink() {
    const linkText = document.getElementById('expiredLinkInput').value.trim();
    if (!linkText) return;

    try {
        const urlObj = new URL(linkText);
        const params = new URLSearchParams(urlObj.search);
        
        const encodedSite = params.get('site');
        const encodedContact = params.get('contact');
        const mode = params.get('mode');

        if (encodedSite) {
            // বেস৬৪ ডিকোড করে ইনপুটে বসানো
            document.getElementById('targetUrl').value = atob(encodedSite);
        }
        if (encodedContact) {
            document.getElementById('contactInfo').value = atob(encodedContact);
        }
        if (mode) {
            const modeRadio = document.getElementById(mode + 'Mode');
            if (modeRadio) {
                modeRadio.checked = true;
                // যদি পুরোনো লিংকটি এভারগ্রিন হয়ে থাকে এবং বর্তমানে ক্যালেন্ডার ভিউ সিলেক্ট না থাকে, তবে এভারগ্রিন মোড অন থাকবে
                if(document.getElementById('durationPreset').value !== 'custom-date') {
                    document.getElementById('evergreenMode').disabled = false;
                    document.getElementById('evergreenModeLabel').classList.remove('disabled-mode');
                }
            }
        }
    } catch (e) {
        // ইউজার ভুল বা ইনকমপ্লিট লিংক পেস্ট করলে এরর ইগনোর করবে
    }
}

async function generateLink() {
    const targetUrl = document.getElementById('targetUrl').value;
    const contactInfo = document.getElementById('contactInfo').value || "your email/phone";
    const preset = document.getElementById('durationPreset').value;
    const mode = document.querySelector('input[name="trialMode"]:checked').value;
    const resultElement = document.getElementById('result');

    if (!targetUrl) {
        alert("Please enter the Original Web URL.");
        return;
    }

    let durationInDays = 0;
    let customTimestamp = null;

    if (preset === 'custom-days') {
        const val = document.getElementById('customDaysInput').value;
        if (!val || val <= 0) { alert("Please enter a valid number of days."); return; }
        durationInDays = parseFloat(val);
    } else if (preset === 'custom-date') {
        const val = document.getElementById('customDateInput').value;
        if (!val) { alert("Please select a target date and time."); return; }
        customTimestamp = new Date(val).getTime();
        if (customTimestamp <= new Date().getTime()) { alert("Please select a future date and time."); return; }
    } else {
        durationInDays = parseFloat(preset);
    }

    const encodedUrl = btoa(targetUrl);
    const encodedContact = btoa(contactInfo);
    
    let netlifyUrl = window.location.origin + `/.netlify/functions/proxy?site=${encodedUrl}&contact=${encodedContact}&mode=${mode}`;

    if (mode === 'fixed') {
        let expiryTimestamp;
        if (preset === 'custom-date') {
            expiryTimestamp = customTimestamp;
        } else {
            const expiryDate = new Date();
            expiryDate.setTime(expiryDate.getTime() + (durationInDays * 24 * 60 * 60 * 1000));
            expiryTimestamp = expiryDate.getTime();
        }
        netlifyUrl += `&expires=${expiryTimestamp}`;
    } else {
        // এভারগ্রিন লিংকের ক্ষেত্রে এক্সটেনশন করলে ইউজারের ব্রাউজারের লোকালস্টোরেজ কী (Key) রিসেট করতে হবে।
        // তাই নতুন লিংকে একটি ইউনিক টাইমস্ট্যাম্প জুড়ে দেওয়া হচ্ছে যাতে ব্রাউজার এটিকে নতুন লিংক হিসেবে চেনে।
        const durationMs = durationInDays * 24 * 60 * 60 * 1000;
        netlifyUrl += `&durationMs=${durationMs}&daysLabel=${preset === 'custom-days' ? durationInDays : preset}&extendToken=${new Date().getTime()}`;
    }

    resultElement.innerHTML = `
        <div style="padding: 15px; background: #e9ecef; border-radius: 5px; margin-top: 20px;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">Your Generated / Extended Trial Link:</p>
            <input type="text" value="${netlifyUrl}" id="finalLink" readonly style="width: 100%; margin-bottom: 10px; padding: 8px; box-sizing: border-box;">
            <button onclick="copyLink()" style="background: #007bff; margin-top:5px;">Copy Link</button>
        </div>
    `;
}

function copyLink() {
    const copyText = document.getElementById("finalLink");
    copyText.select();
    navigator.clipboard.writeText(copyText.value);
    alert("Link copied to clipboard!");
}
