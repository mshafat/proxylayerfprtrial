const axios = require('axios');

exports.handler = async (event, context) => {
    const encodedUrl = event.queryStringParameters.site;
    const encodedContact = event.queryStringParameters.contact;
    const mode = event.queryStringParameters.mode || 'fixed';
    
    // Fixed Mode
    const expires = event.queryStringParameters.expires;
    
    // Evergreen Mode
    const durationMs = event.queryStringParameters.durationMs;
    const daysLabel = event.queryStringParameters.daysLabel || "Custom";

    if (!encodedUrl) {
        return { statusCode: 400, body: "Invalid Request: Missing site." };
    }

    try {
        const targetUrl = Buffer.from(encodedUrl, 'base64').toString('ascii');
        const contactInfo = encodedContact ? Buffer.from(encodedContact, 'base64').toString('ascii') : "the administrator";
        
        let isExpired = false;
        let displayExpiry = "";

        // ১. FIXED CALENDAR MODE LOGIC
        if (mode === 'fixed' && expires) {
            const expiryDate = new Date(parseInt(expires));
            const today = new Date();
            displayExpiry = expiryDate.toLocaleString();
            if (today > expiryDate) isExpired = true;
        }

        if (isExpired) {
            return returnExpiredPage(contactInfo, displayExpiry);
        }

        const response = await axios.get(targetUrl);
        let html = response.data;

        // ২. EVERGREEN MODE LOGIC
        let evergreenScript = "";
        if (mode === 'evergreen' && durationMs) {
            const storageKey = `trial_start_${encodedUrl}`;
            evergreenScript = `
                <script>
                    (function() {
                        let startTime = localStorage.getItem('${storageKey}');
                        const maxPeriod = parseInt('${durationMs}'); 
                        const now = new Date().getTime();

                        if (!startTime) {
                            localStorage.setItem('${storageKey}', now);
                            startTime = now;
                        }

                        const timeElapsed = now - parseInt(startTime);
                        if (timeElapsed > maxPeriod) {
                            document.body.innerHTML = \`
                                <div style="font-family: Arial, sans-serif; text-align: center; max-width: 500px; margin: 100px auto; padding: 30px; border: 1px solid #ffccd5; background-color: #fff5f5; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); color: #333;">
                                    <h1 style="color: #e53e3e; margin-top: 0;">Sorry, your trial period has expired!</h1>
                                    <p style="font-size: 16px;">If you like this web application and want full access, please contact us for details:</p>
                                    <div style="background: #edf2f7; padding: 15px; font-weight: bold; font-size: 18px; color: #2d3748; border-radius: 4px; display: inline-block; word-break: break-all; margin-bottom: 20px;">
                                        ${contactInfo}
                                    </div>
                                </div>
                            \`;
                            window.stop();
                        }
                    })();
                </script>
            `;
        }

        // ব্যানার টেক্সট জেনারেশন
        let bannerText = "";
        if (mode === 'fixed') {
            bannerText = `Expires on: ${displayExpiry}`;
        } else {
            const labelText = daysLabel === "0.5" ? "12 Hours" : (daysLabel === "1" ? "24 Hours" : `${daysLabel} Days`);
            bannerText = `Individual Free Trial (${labelText})`;
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

function returnExpiredPage(contactInfo, displayExpiry) {
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
                    .expiry-date { color: #a0aec0; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>Sorry, this trial period has expired!</h1>
                    <p>If you like this web application and want full access, please contact us for details:</p>
                    <div class="contact-box">${contactInfo}</div>
                    <p class="expiry-date">Expired on: ${displayExpiry}</p>
                </div>
            </body>
            </html>
        `
    };
}
