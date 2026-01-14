import { ObjectId } from "mongodb";
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
  const users = db.collection("users");

  // 🔐 TOKEN OBRIGATÓRIO
  const { t } = req.query;

  if (!t) {
    return res.status(401).json({ error: "Token não informado" });
  }

  const user = await users.findOne({ token: t });

  if (!user) {
    return res.status(401).json({ error: "Token inválido" });
  }

  // 🔹 LISTAR PRODUTOS
  if (req.method === "GET") {
    const data = await produtos
      .find({ userId: user._id })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json(data);
  }

  // 🔹 EDITAR PRODUTO
  if (req.method === "PUT") {
    const { id } = req.query;
    const { nome, preco, desconto, link, imagem } = req.body;

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const update = {};
    if (nome !== undefined) update.nome = nome;
    if (preco !== undefined) update.preco = preco;
    if (desconto !== undefined) update.desconto = desconto;
    if (link !== undefined) update.link = link;
    if (imagem !== undefined) update.imagem = imagem;

    const result = await produtos.updateOne(
      { _id: new ObjectId(id), userId: user._id },
      { $set: update }
    );

    if (!result.matchedCount) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    return res.status(200).json({ success: true });
  }

  // 🔹 DELETAR PRODUTO
  if (req.method === "DELETE") {
    const { id } = req.query;

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const result = await produtos.deleteOne({
      _id: new ObjectId(id),
      userId: user._id
    });

    if (!result.deletedCount) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Método não permitido" });
}
