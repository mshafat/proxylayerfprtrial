function handleDurationChange() {
    const preset = document.getElementById('durationPreset').value;
    const customDaysInput = document.getElementById('customDaysInput');
    const customDateInput = document.getElementById('customDateInput');
    const evergreenMode = document.getElementById('evergreenMode');
    const evergreenLabel = document.getElementById('evergreenModeLabel');
    const fixedMode = document.getElementById('fixedMode');

    // ইনপুট ফিল্ডগুলো রিসেট করা
    customDaysInput style.display = 'none';
    customDateInput style.display = 'none';

    // ডিজেবল স্টেট রিসেট করা
    evergreenMode.disabled = false;
    evergreenLabel.classList.remove('disabled-mode');

    if (preset === 'custom-days') {
        customDaysInput style.display = 'block';
    } else if (preset === 'custom-date') {
        customDateInput style.display = 'block';
        // তারিখ ও সময় অপশন আনলে অটোমেটিক অন-ক্লিক মোড ডিজেবল করার প্রস্তুতি
        fixedMode.checked = true;
        evergreenMode.disabled = true;
        evergreenLabel.classList.add('disabled-mode');
    }
}

function handleDateInputChange() {
    // নিশ্চিত করা যে তারিখ ইনপুট দিলেও অন-ক্লিক ডিজেবল থাকে
    const evergreenMode = document.getElementById('evergreenMode');
    const fixedMode = document.getElementById('fixedMode');
    fixedMode.checked = true;
    evergreenMode.disabled = true;
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

    // ডিউরেশন ক্যালকুলেশন
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
        // Evergreen মোডের জন্য মিলিসেকেন্ডে কনভার্ট করে পাঠানো হচ্ছে (১২ ঘন্টার জন্য ০.৫ দিন হ্যান্ডেল করার জন্য)
        const durationMs = durationInDays * 24 * 60 * 60 * 1000;
        netlifyUrl += `&durationMs=${durationMs}&daysLabel=${preset === 'custom-days' ? durationInDays : preset}`;
    }

    resultElement.innerHTML = `
        <div style="padding: 15px; background: #e9ecef; border-radius: 5px; margin-top: 20px;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">Your ${mode === 'fixed' ? 'Fixed' : 'Evergreen'} Trial Link:</p>
            <input type="text" value="${netlifyUrl}" id="finalLink" readonly style="width: 100%; margin-bottom: 10px; padding: 8px; box-sizing: border-box;">
            <button onclick="copyLink()" style="background: #007bff; margin-top:5px;">Copy Link</button>
        </div>
    `;
}

function copyLink() {
    const copyText = document.getElementById("finalLink");
    copyText.select();
    navigator.clipboard.writeText(copyText.value);
    alert("Trial link copied to clipboard!");
}
