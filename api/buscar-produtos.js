const { getProdutoInfo } = require("../scripts/buscarprodutos.js");

export default async function handler(req, res) {
  // 🔹 CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL não informada" });
  }

  try {
    const info = await getProdutoInfo(url);

    if (!info) {
      return res.status(500).json({ error: "Falha ao buscar produto" });
    }

    return res.status(200).json(info);
  } catch (err) {
    console.error("Erro ao buscar produto:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
}
