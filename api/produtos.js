import { connectPernalongaBot } from "../scripts/database.js";

export default async function handler(req, res) {
  // 🔹 CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const db = await connectPernalongaBot();
  const produtos = db.collection("produtos");

  // 🔹 LISTAR PRODUTOS
  if (req.method === "GET") {
    const { user } = req.query;

    if (!user) {
      return res.status(400).json({ error: "user é obrigatório" });
    }

    const data = await produtos
      .find({ userNumber: user })
      .sort({ dataCadastro: -1 })
      .toArray();

    return res.status(200).json(data);
  }

  // 🔹 EDITAR PRODUTO
  if (req.method === "PUT") {
    const { idProduto } = req.query;
    const { nome, preco, desconto, link, imagem } = req.body;

    if (!idProduto) {
      return res.status(400).json({ error: "idProduto é obrigatório" });
    }

    const update = {};
    if (nome !== undefined) update.nome = nome;
    if (preco !== undefined) update.preco = preco;
    if (desconto !== undefined) update.desconto = desconto;
    if (link !== undefined) update.link = link;
    if (imagem !== undefined) update.imagem = imagem;

    await produtos.updateOne(
      { idProduto },
      { $set: update }
    );

    return res.status(200).json({ success: true });
  }

  // 🔹 DELETAR PRODUTO
  if (req.method === "DELETE") {
    const { idProduto } = req.query;

    if (!idProduto) {
      return res.status(400).json({ error: "idProduto é obrigatório" });
    }

    await produtos.deleteOne({ idProduto });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Método não permitido" });
}
