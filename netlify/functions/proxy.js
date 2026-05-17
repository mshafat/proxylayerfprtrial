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
                    <div style="font-family: Arial, sans-serif; text-align: center; max-width: 500px; margin: 100px auto; padding: 30px; border: 1px solid #ffccd5; background-color: #fff5f5; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                        <h1 style="color: #e53e3e; margin-bottom: 10px;">Sorry, this trial period has expired!</h1>
                        <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">If you like this web application and want full access, please contact us at:</p>
                        <div style="background: #edf2f7; padding: 12px; font-weight: bold; font-size: 18px; color: #2d3748; border-radius: 4px; display: inline-block; margin-top: 10px; word-break: break-all;">
                            ${contactInfo}
                        </div>
                        <p style="color: #a0aec0; margin-top: 25px; font-size: 12px;">Expired on: ${expiryDate.toLocaleString()}</p>
                    </div>
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
