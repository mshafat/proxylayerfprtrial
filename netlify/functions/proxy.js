const axios = require('axios');

exports.handler = async (event, context) => {
    const encodedUrl = event.queryStringParameters.site;
    const encodedContact = event.queryStringParameters.contact;
    const mode = event.queryStringParameters.mode || 'fixed';
    const expires = event.queryStringParameters.expires;
    const durationMs = event.queryStringParameters.durationMs;
    const daysLabel = event.queryStringParameters.daysLabel || "Custom";
    
    // ইউজার যদি এক্সপায়ারড পেজ থেকে কোনো রিনিউ কোড ইনপুট দেয়
    const renewCode = event.queryStringParameters.renewCode || "";

    if (!encodedUrl) {
        return { statusCode: 400, body: "Invalid Request: Missing site." };
    }

    try {
        const targetUrl = Buffer.from(encodedUrl, 'base64').toString('ascii');
        const contactInfo = encodedContact ? Buffer.from(encodedContact, 'base64').toString('ascii') : "the administrator";
        
        let isExpired = false;
        let displayExpiry = "";
        let extraTimeMs = 0;

        // সিক্রেট পাসকোড লজিক (কোড অনুযায়ী এক্সট্রা মিলিসেকেন্ড যোগ হবে)
        // আপনি আপনার ইচ্ছামত কোড এবং দিন এখানে সেট করতে পারবেন
        if (renewCode === 'plus3days') { extraTimeMs = 3 * 24 * 60 * 60 * 1000; }
        else if (renewCode === 'plus7days') { extraTimeMs = 7 * 24 * 60 * 60 * 1000; }
        else if (renewCode === 'plus30days') { extraTimeMs = 30 * 24 * 60 * 60 * 1000; }

        // ১. FIXED CALENDAR MODE
        if (mode === 'fixed' && expires) {
            const expiryDate = new Date(parseInt(expires) + extraTimeMs);
            const today = new Date();
            displayExpiry = expiryDate.toLocaleString();
            if (today > expiryDate) isExpired = true;
        }

        if (isExpired) {
            // যদি এক্সপায়ার হয়ে যায়, তবে রিনিউ করার অপশন সহ পেজ দেখাবে
            return returnExpiredPage(contactInfo, displayExpiry, event.queryStringParameters);
        }

        const response = await axios.get(targetUrl);
        let html = response.data;

        // ২. EVERGREEN MODE
        let evergreenScript = "";
        if (mode === 'evergreen' && durationMs) {
            const storageKey = `trial_start_${encodedUrl}`;
            evergreenScript = `
                <script>
                    (function() {
                        // যদি রিনিউ কোড পাস করা হয়, তবে লোকালস্টোরেজ রিসেট করে নতুন করে টাইম শুরু হবে
                        if ("${renewCode}" !== "") {
                            localStorage.setItem('${storageKey}', new Date().getTime());
                        }

                        let startTime = localStorage.getItem('${storageKey}');
                        const maxPeriod = parseInt('${durationMs}') + parseInt('${extraTimeMs}'); 
                        const now = new Date().getTime();

                        if (!startTime) {
                            localStorage.setItem('${storageKey}', now);
                            startTime = now;
                        }

                        const timeElapsed = now - parseInt(startTime);
                        if (timeElapsed > maxPeriod) {
                            // এভারগ্রিন মোডে এক্সপায়ার হলে রিনিউ ফর্ম দেখানোর রিডাইরেকশন লজিক
                            const currentUrl = new URL(window.location.href);
                            currentUrl.searchParams.set('expired_status', 'true');
                            
                            document.body.innerHTML = \`
                                <div style="font-family: Arial, sans-serif; text-align: center; max-width: 500px; margin: 100px auto; padding: 30px; border: 1px solid #ffccd5; background-color: #fff5f5; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); color: #333;">
                                    <h1 style="color: #e53e3e; margin-top: 0;">Sorry, your trial period has expired!</h1>
                                    <p style="font-size: 16px;">Please refresh or enter an extension code if provided by the admin.</p>
                                    <div style="margin: 20px 0;">
                                        <input type="text" id="rCode" placeholder="Enter Extension Passcode" style="padding: 10px; width: 200px; border: 1px solid #ddd; border-radius: 4px;">
                                        <button onclick="let u = new URL(window.location.href); u.searchParams.set('renewCode', document.getElementById('rCode').value); window.location.href = u.href;" style="padding: 10px 15px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Apply</button>
                                    </div>
                                    <p style="font-size: 14px; color: #666;">Contact for details: <strong>${contactInfo}</strong></p>
                                </div>
                            \`;
                            window.stop();
                        }
                    })();
                </script>
            `;
        }

        let bannerText = "";
        if (mode === 'fixed') {
            bannerText = `Expires on: ${displayExpiry}`;
        } else {
            const labelText = daysLabel === "0.5" ? "12 Hours" : (daysLabel === "1" ? "24 Hours" : `${daysLabel} Days`);
            bannerText = `Individual Free Trial (${labelText}) ${renewCode ? '[Extended]' : ''}`;
        }

        const banner = `
            <div style="background: #ff4757; color: white; text-align: center; padding: 10px; position: sticky; top: 0; z-index: 9999; font-family: sans-serif; font-weight: bold; font-size: 14px;">
                TRIAL VERSION. ${bannerText}
            </div>`;
        
        const baseTag = `<base href="${targetUrl}">`;
        
        html = html.replace('<head>', `<head>${baseTag}${evergreenScript}`);
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

function returnExpiredPage(contactInfo, displayExpiry, queryParams) {
    // বর্তমান ইউআরএল প্যারামিটার তৈরি করা যাতে রিনিউ কোড সাবমিট করা যায়
    const searchParams = new URLSearchParams(queryParams);
    
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
                    .contact-box { background: #edf2f7; padding: 15px; font-weight: bold; font-size: 18px; color: #2d3748; border-radius: 4px; display: inline-block; word-break: break-all; margin: 15px 0; }
                    .renew-box { margin-top: 20px; padding-top: 20px; border-top: 1px dashed #feb2b2; }
                    input { padding: 10px; width: 60%; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 14px; }
                    button { padding: 10px 15px; background: #3182ce; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; margin-left: 5px; }
                    button:hover { background: #2b6cb0; }
                    .expiry-date { color: #a0aec0; font-size: 14px; margin-top: 15px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>Sorry, this trial period has expired!</h1>
                    <p>To extend your trial or get full access, please contact the administrator:</p>
                    <div class="contact-box">${contactInfo}</div>
                    
                    <!-- রিনিউ কোড ইনপুট সেকশন -->
                    <div class="renew-box">
                        <p style="font-size:14px; margin-bottom:8px; font-weight:bold; color:#4a5568;">Have an Extension Passcode?</p>
                        <input type="text" id="passcode" placeholder="Enter code (e.g. plus7days)">
                        <button onclick="applyCode()">Extend</button>
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
