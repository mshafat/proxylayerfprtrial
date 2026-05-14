const axios = require('axios');

exports.handler = async (event, context) => {
    const targetUrl = "https://example.com"; // এখানে আপনার আসল লিঙ্ক দিন
    const expiryDate = new Date("2026-05-20");
    const today = new Date();

    if (today > expiryDate) {
        return { statusCode: 403, body: "Expired!" };
    }

    try {
        const response = await axios.get(targetUrl);
        return {
            statusCode: 200,
            headers: { "Content-Type": "text/html" },
            body: response.data
        };
    } catch (error) {
        return { statusCode: 500, body: error.toString() };
    }
};
