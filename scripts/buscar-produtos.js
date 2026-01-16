const axios = require("axios");
const cheerio = require("cheerio");

async function getProdutoInfo(url) {
    try {
        const { data } = await axios.get(url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });

        const $ = cheerio.load(data);

        // === Nome do produto ===
        const nome = $('h1').first().text().trim()
            || $('meta[property="og:title"]').attr("content")
            || $('meta[name="twitter:title"]').attr("content")
            || null;

        // === Preço antigo (opcional) ===
        const precoAntigoFraction = $('s.andes-money-amount--previous .andes-money-amount__fraction').first()?.text()?.trim();
        const precoAntigoCents = $('s.andes-money-amount--previous .andes-money-amount__cents').first()?.text()?.trim() || '00';
        const precoAntigo = precoAntigoFraction ? `R$ ${precoAntigoFraction},${precoAntigoCents}` : null;

        // === Preço atual ===
        const precoFraction = $('.poly-price__current .andes-money-amount__fraction').first()?.text()?.trim();
        const precoCents = $('.poly-price__current .andes-money-amount__cents').first()?.text()?.trim() || '00';
        const preco = precoFraction ? `R$ ${precoFraction},${precoCents}` : null;

        // === Desconto (opcional) ===
        const desconto = $('.poly-price__current .andes-money-amount__discount').first()?.text()?.trim() || null;

        // === Imagem ===
        const imagem = $('meta[property="og:image"]').attr("content")
            || $("img.ui-pdp-image").first()?.attr("src")
            || null;

        return {
            nome,
            preco,
            precoAntigo,
            desconto,
            imagem
        };

    } catch (err) {
        console.error("❌ Erro ao buscar produto:", err.message);
        return null;
    }
}

module.exports = { getProdutoInfo };
