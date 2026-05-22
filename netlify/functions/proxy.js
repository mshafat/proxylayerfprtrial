const axios = require('axios');

exports.handler = async (event, context) => {
    const encodedUrl = event.queryStringParameters.site;
    const expires = event.queryStringParameters.expires;
    const encodedContact = event.queryStringParameters.contact;

    if (!encodedUrl || !expires) {
        return { statusCode: 400, body: "Invalid Request: Missing parameters." };
    }

    try {
        const targetUrl = Buffer.from(encodedUrl, 'base64').toString('ascii');
        const contactInfo = encodedContact ? Buffer.from(encodedContact, 'base64').toString('ascii') : "the administrator";
        const expiryDate = new Date(parseInt(expires));
        const today = new Date();

        // Check if trial has expired
        if (today > expiryDate) {
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
                            body {
                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                                margin: 0;
                                padding: 20px;
                                background-color: #f7fafc;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                min-height: 100vh;
                                justify-content: center;
                            }
                            .card {
                                text-align: center;
                                max-width: 500px;
                                width: 100%;
                                box-sizing: border-box;
                                padding: 30px;
                                border: 1px solid #ffccd5;
                                background-color: #fff5f5;
                                border-radius: 8px;
                                box-shadow: 0 4px 10px rgba(0,0,0,0.05);
                            }
                            h1 {
                                color: #e53e3e;
                                margin-top: 0;
                                margin-bottom: 15px;
                                font-size: 24px;
                                font-weight: 700;
                            }
                            p {
                                color: #4a5568;
                                font-size: 16px;
                                line-height: 1.6;
                                margin-bottom: 20px;
                            }
                            .contact-box {
                                background: #edf2f7;
                                padding: 15px;
                                font-weight: bold;
                                font-size: 18px;
                                color: #2d3748;
                                border-radius: 4px;
                                display: inline-block;
                                word-break: break-all;
                                margin-top: 10px;
                                margin-bottom: 20px;
                            }
                            .expiry-date {
                                color: #a0aec0;
                                font-size: 14px;
                                margin-top: 10px;
                                margin-bottom: 0;
                            }
                            @media (max-width: 480px) {
                                h1 { font-size: 20px; }
                                p { font-size: 15px; }
                                .contact-box { font-size: 16px; padding: 12px; }
                                .expiry-date { font-size: 13px; }
                                .card { padding: 20px; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <h1>Sorry, this trial period has expired!</h1>
                            <p>If you like this web application and want full access, please contact us for details:</p>
                            <div class="contact-box">
                                ${contactInfo}
                            </div>
                            <p class="expiry-date">Expired on: ${expiryDate.toLocaleString()}</p>
                        </div>
                    </body>
                    </html>
                `
            };
        }

        const response = await axios.get(targetUrl);
        let html = response.data;

        // Trial banner and base URL fix
        const banner = `
            <div style="background: #ff4757; color: white; text-align: center; padding: 10px; position: sticky; top: 0; z-index: 9999; font-family: sans-serif; font-weight: bold;">
                TRIAL VERSION. Expires on: ${expiryDate.toLocaleString()}
            </div>`;
        
        const baseTag = `<base href="${targetUrl}">`;
        
        html = html.replace('<head>', `<head>${baseTag}`);
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
