const axios = require('axios');

exports.handler = async (event, context) => {
    const encodedUrl = event.queryStringParameters.site;
    const expires = event.queryStringParameters.expires;

    if (!encodedUrl || !expires) {
        return { statusCode: 400, body: "Invalid Request" };
    }

    try {
        const targetUrl = Buffer.from(encodedUrl, 'base64').toString('ascii');
        const expiryDate = new Date(parseInt(expires));
        const today = new Date();

        // মেয়াদ উত্তীর্ণ হয়েছে কি না চেক
        if (today > expiryDate) {
            return { 
                statusCode: 403, 
                headers: { "Content-Type": "text/html; charset=utf-8" },
                body: "<h1 style='text-align:center; margin-top:50px;'>দুঃখিত, এই ট্রায়ালের মেয়াদ শেষ হয়ে গেছে!</h1>" 
            };
        }

        const response = await axios.get(targetUrl);
        let html = response.data;

        // ট্রায়াল ব্যানার এবং বেস ইউআরএল ফিক্স
        const banner = `
            <div style="background: #ff4757; color: white; text-align: center; padding: 10px; position: sticky; top: 0; z-index: 9999; font-family: sans-serif;">
                এটি একটি ট্রায়াল ভার্সন। মেয়াদ শেষ হবে: ${expiryDate.toLocaleString()}
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
        return { statusCode: 500, body: "সাইটটি লোড করা সম্ভব হচ্ছে না।" };
    }
};
