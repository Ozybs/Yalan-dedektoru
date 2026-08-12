// /api/gemini.js
// Bu dosya Vercel Serverless Function'dır — TARAYICIDA DEĞİL, Vercel'in sunucusunda çalışır.
// Bu sayede Gemini API anahtarınız hiçbir zaman kullanıcıya (sayfa kaynağına) görünmez.
//
// KURULUM:
// 1) Bu dosyayı GitHub reponuzda proje kök dizininde "api/gemini.js" yoluna ekleyin
//    (yani index.html ile aynı seviyede bir "api" klasörü açıp içine koyun).
// 2) Vercel Dashboard > Projeniz > Settings > Environment Variables kısmına gidin.
// 3) Key: GEMINI_API_KEY   Value: (Google AI Studio'dan aldığınız gerçek anahtar)
//    ekleyin ve "Production" ortamı için de işaretli olduğundan emin olun.
// 4) Kaydettikten sonra Vercel projenizi yeniden deploy edin (Redeploy) —
//    environment variable'lar sadece yeni deploy'larda devreye girer.
// 5) index.html içindeki GEMINI_API_KEY sabitine artık gerçek anahtarı YAZMAYIN;
//    zaten client kodu artık /api/gemini adresine istek atacak şekilde ayarlı.

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Sadece POST istekleri kabul edilir.' });
        return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        res.status(500).json({ error: 'Sunucuda GEMINI_API_KEY tanımlı değil. Vercel Environment Variables ayarlarını kontrol edin.' });
        return;
    }

    const { question } = req.body || {};
    if (!question || typeof question !== 'string' || !question.trim()) {
        res.status(400).json({ error: 'Geçerli bir soru gönderilmedi.' });
        return;
    }

    // Aşırı uzun girdileri sınırlayarak kötüye kullanım/maliyet riskini azaltıyoruz.
    const safeQuestion = question.trim().slice(0, 6000);

    try {
        const model = 'gemini-2.5-flash'; // güncel model adını ai.google.dev/gemini-api/docs/models üzerinden kontrol edebilirsiniz
        const upstream = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: safeQuestion }] }]
                })
            }
        );

        const data = await upstream.json();

        if (!upstream.ok) {
            res.status(upstream.status).json({ error: data?.error?.message || 'Gemini API hatası.' });
            return;
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        res.status(200).json({ text });
    } catch (err) {
        console.error('Gemini proxy hatası:', err);
        res.status(500).json({ error: 'Sunucu tarafında beklenmeyen bir hata oluştu.' });
    }
}
