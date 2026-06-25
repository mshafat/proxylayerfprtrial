const axios = require('axios');

exports.handler = async (event, context) => {
    const encodedUrl = event.queryStringParameters.site;
    const encodedContact = event.queryStringParameters.contact;
    const encodedPurchase = event.queryStringParameters.buy || "";
    const mode = event.queryStringParameters.mode || 'fixed';
    const expires = event.queryStringParameters.expires;
    const durationMs = event.queryStringParameters.durationMs;
    
    // ক্লায়েন্টের ইনপুট দেওয়া পাসকোড
    const renewCode = (event.queryStringParameters.renewCode || "").trim().toLowerCase();

    if (!encodedUrl) {
        return { statusCode: 400, body: "Invalid Request: Missing site." };
    }

    try {
        const targetUrl = Buffer.from(encodedUrl, 'base64').toString('ascii');
        const contactInfo = encodedContact ? Buffer.from(encodedContact, 'base64').toString('ascii') : "the administrator";
        const purchaseUrl = encodedPurchase ? Buffer.from(encodedPurchase, 'base64').toString('ascii') : "";
        
        let isExpired = false;
        let displayExpiry = "";
        let extraTimeMs = 0;

        // ----------------------------------------------------
        // পাসকোড ভ্যালিডেশন এবং ম্যাথ লজিক (v1.9)
        // ----------------------------------------------------
        if (renewCode.startsWith('p') && renewCode.includes('-')) {
            const now = new Date();
            
            // ১. লোকাল টাইম অনুযায়ী আজকের তারিখের যোগফল (যেমন: ২৫ তারিখ = ২+৫ = ৭)
            const localDate = now.getDate();
            const localSum = localDate.toString().split('').reduce((acc, digit) => acc + parseInt(digit), 0);
            
            // ২. সার্ভার/ইউটিসি টাইম অনুযায়ী তারিখের যোগফল
            const utcDate = now.getUTCDate();
            const utcSum = utcDate.toString().split('').reduce((acc, digit) => acc + parseInt(digit), 0);
            
            const parts = renewCode.split('-');
            const firstPart = parts[0]; // যেমন: 'p168'
            const secondPart = parts[1]; // যেমন: '7'

            // শেষের সংখ্যাটি আজকের লোকাল বা ইউটিসি যোগফলের সাথে মিললে
            if (secondPart === localSum.toString() || secondPart === utcSum.toString()) {
                const hoursText = firstPart.slice(1); // '168'
                const hours = parseInt(hoursText);

                if (!isNaN(hours) && hours > 0) {
                    extraTimeMs = hours * 60 * 60 * 1000; // মিলিসেকেন্ডে রূপান্তর
                }
            }
        }
        // ----------------------------------------------------

        let finalExpiryTimestamp = 0;

        if (mode === 'fixed' && expires) {
            finalExpiryTimestamp = parseInt(expires) + extraTimeMs;
            const expiryDate = new Date(finalExpiryTimestamp);
            displayExpiry = expiryDate.toLocaleString();
            if (new Date().getTime() > finalExpiryTimestamp) isExpired = true;
        }

        if (isExpired) {
            return returnExpiredPage(contactInfo, displayExpiry, purchaseUrl, event.queryStringParameters);
        }

        const response = await axios.get(targetUrl);
        let html = response.data;

        // এভারগ্রিন ও ফিক্সড মোডের জন্য গ্লোবাল এক্সপায়ার্ড স্ক্রিন HTML
        const expiredPageHtml = `
            <div style="font-family: Arial, sans-serif; text-align: center; max-width: 500px; margin: 100px auto; padding: 30px; border: 1px solid #ffccd5; background-color: #fff5f5; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); color: #333;">
                <h1 style="color: #e53e3e; margin-top: 0;">Sorry, your trial period has expired!</h1>
                <p style="font-size: 16px;">To get unlimited full access immediately, click below:</p>
                <div style="margin: 15px 0 25px 0;">
                    \${"${purchaseUrl}" ? \`<a href="${purchaseUrl}" target="_blank" style="display:inline-block; background:#28a745; color:white; font-weight:bold; padding:12px 25px; text-decoration:none; border-radius:4px; font-size:16px; margin-top:10px; box-shadow:0 4px 6px rgba(0,0,0,0.1);">Purchase Full Access</a>\` : ''}
                </div>
                <p style="font-size: 14px; color:#555;">Have an Extension Passcode?</p>
                <div style="margin: 15px 0;">
                    <input type="text" id="rCode" placeholder="Enter Extension Passcode" style="padding: 10px; width: 220px; border: 1px solid #ddd; border-radius: 4px;">
                    <button onclick="let u = new URL(window.location.href); u.searchParams.set('renewCode', document.getElementById('rCode').value); window.location.href = u.href;" style="padding: 10px 15px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Apply</button>
                </div>
                <p style="font-size: 13px; color: #666;">Contact Support: <strong>${contactInfo}</strong></p>
            </div>
        `;

        // লাইভ কাউন্টডাউন স্ক্রিপ্ট
        const storageKey = `trial_start_${encodedUrl}`;
        const countdownScript = `
            <script>
                (function() {
                    let mode = "${mode}";
                    let extraMs = parseInt("${extraTimeMs}");
                    let targetExpiry = 0;

                    if (mode === "fixed") {
                        targetExpiry = parseInt("${finalExpiryTimestamp}");
                    } else {
                        if (extraMs > 0) localStorage.setItem('${storageKey}', new Date().getTime());
                        let startTime = localStorage.getItem('${storageKey}');
                        const maxPeriod = parseInt("${durationMs}") + extraMs;
                        
                        if (!startTime) {
                            startTime = new Date().getTime();
                            localStorage.setItem('${storageKey}', startTime);
                        }
                        targetExpiry = parseInt(startTime) + maxPeriod;
                    }

                    function updateCountdown() {
                        const now = new Date().getTime();
                        const timeLeft = targetExpiry - now;

                        if (timeLeft <= 0) {
                            clearInterval(timerInterval);
                            document.body.innerHTML = \`${expiredPageHtml}\`;
                            window.stop();
                            return;
                        }

                        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

                        let countdownText = "Trial Ends In: ";
                        if (days > 0) countdownText += days + "d ";
                        countdownText += (hours < 10 ? "0" : "") + hours + "h "
                                      + (minutes < 10 ? "0" : "") + minutes + "m "
                                      + (seconds < 10 ? "0" : "") + seconds + "s";

                        const displayEl = document.getElementById("trial-countdown-clock");
                        if (displayEl) displayEl.innerText = countdownText;
                    }

                    const timerInterval = setInterval(updateCountdown, 1000);
                    window.addEventListener("DOMContentLoaded", updateCountdown);
                })();
            </script>
        `;

        let buyButtonHtml = purchaseUrl ? `<a href="${purchaseUrl}" target="_blank" style="background:#fff; color:#ff4757; text-decoration:none; padding:3px 10px; border-radius:3px; margin-left:15px; font-size:12px; font-weight:bold; display:inline-block; box-shadow:0 2px 5px rgba(0,0,0,0.2);">Buy Now</a>` : "";

        const banner = `
            <div style="background: #ff4757; color: white; text-align: center; padding: 10px; position: sticky; top: 0; z-index: 9999; font-family: sans-serif; font-weight: bold; font-size: 14px; display:flex; align-items:center; justify-content:center;">
                <span id="trial-countdown-clock">Calculating Trial Time...</span> ${buyButtonHtml}
            </div>`;
        
        const baseTag = `<base href="${targetUrl}">`;
        
        html = html.replace('</head>', `${countdownScript}${baseTag}</head>`);
        html = html.replace('<body>', `<body>${banner}`);

        return {
            statusCode: 200,
            headers: { "Content-Type": "text/html" },
            body: html
        };
    } catch (error) {
        return { statusCode: 500, body: "Error loading the target website." };
    }
};

function returnExpiredPage(contactInfo, displayExpiry, purchaseUrl, queryParams) {
    let purchaseBtnHtml = purchaseUrl ? `<a href="${purchaseUrl}" target="_blank" class="buy-btn">Purchase Full Access</a>` : "";
    
    return {
        statusCode: 403,
        headers: { "Content-Type": "text/html; charset=utf-8" },
        body: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Trial Period Expired</title>
                <style>
                    body { font-family: -apple-system, sans-serif; margin: 0; padding: 20px; background-color: #f7fafc; display: flex; align-items: center; min-height: 100vh; justify-content: center; }
                    .card { text-align: center; max-width: 500px; width: 100%; padding: 30px; border: 1px solid #ffccd5; background-color: #fff5f5; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); box-sizing: border-box; }
                    h1 { color: #e53e3e; font-size: 24px; margin-bottom: 15px; }
                    p { color: #4a5568; font-size: 16px; }
                    .contact-box { background: #edf2f7; padding: 12px; font-weight: bold; font-size: 16px; color: #2d3748; border-radius: 4px; display: inline-block; word-break: break-all; margin: 10px 0; }
                    .buy-btn { display: inline-block; background: #28a745; color: white; text-decoration: none; padding: 12px 30px; font-weight: bold; border-radius: 5px; font-size: 18px; margin: 15px 0; box-shadow: 0 4px 12px rgba(40,167,69,0.3); }
                    .renew-box { margin-top: 20px; padding-top: 20px; border-top: 1px dashed #feb2b2; }
                    input { padding: 10px; width: 55%; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 14px; box-sizing: border-box;}
                    button { padding: 10px 15px; background: #3182ce; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; margin-left: 5px; }
                    .expiry-date { color: #a0aec0; font-size: 14px; margin-top: 15px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>Sorry, this trial period has expired!</h1>
                    <p>To unlock the software permanently and get full access, click the button below:</p>
                    
                    \${"${purchaseBtnHtml}"}

                    <p style="margin-top:10px; font-size:14px;">Or get in touch with support:</p>
                    <div class="contact-box">${contactInfo}</div>
                    
                    <div class="renew-box">
                        <p style="font-size:13px; margin-bottom:8px; font-weight:bold; color:#4a5568;">Have an Extension Passcode?</p>
                        <input type="text" id="passcode" placeholder="Enter passcode...">
                        <button onclick="applyCode()">Apply</button>
                    </div>

                    <p class="expiry-date">Expired on: ${displayExpiry}</p>
                </div>

                <script>
                    function applyCode() {
                        const code = document.getElementById('passcode').value.trim();
                        if(!code) return alert('Please enter a passcode.');
                        const url = new URL(window.location.href);
                        url.searchParams.set('renewCode', code);
                        window.location.href = url.href;
                    }
                </script>
            </body>
            </html>
        `
    };
}
