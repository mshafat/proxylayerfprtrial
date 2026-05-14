const express = require('express');
const axios = require('axios');
const app = express();

// ডামি ডাটাবেজ (বাস্তবে এটি MongoDB বা SQL এ থাকবে)
const trialLinks = {
    "abc-123": {
        originalUrl: "https://simple-site.com",
        expiryDate: new Date("2026-05-20") // মেয়াদ শেষ হওয়ার তারিখ
    }
};

app.get('/trial/:id', async (req, res) => {
    const trialId = req.params.id;
    const linkData = trialLinks[trialId];

    if (!linkData) {
        return res.status(404).send("লিংকটি পাওয়া যায়নি!");
    }

    // মেয়াদ চেক করা
    const today = new Date();
    if (today > linkData.expiryDate) {
        return res.status(403).send("এই ট্রায়ালের মেয়াদ শেষ হয়ে গেছে!");
    }

    try {
        // আসল সাইটের কন্টেন্ট নিয়ে আসা (Proxying)
        const response = await axios.get(linkData.originalUrl);
        let html = response.data;

        // একটি ছোট স্ক্রিপ্ট ইনজেক্ট করা যাতে মেয়াদ শেষ হলে জানানো যায়
        const banner = `<div style="background: red; color: white; text-align: center; padding: 10px;">
                            আপনার ট্রায়াল শেষ হবে: ${linkData.expiryDate.toDateString()}
                        </div>`;
        html = html.replace('<body>', `<body>${banner}`);

        res.send(html);
    } catch (error) {
        res.status(500).send("সাইটটি লোড করা যাচ্ছে না।");
    }
});

app.listen(3000, () => console.log('Proxy server running on port 3000'));