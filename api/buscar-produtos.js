const { getProdutoInfo } = require("../scripts/buscarprodutos");

export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: "URL não informada" });
    }

    const info = await getProdutoInfo(url);

    if (!info) {
        return res.status(500).json({ error: "Falha ao buscar produto" });
    }

    res.status(200).json(info);
}
