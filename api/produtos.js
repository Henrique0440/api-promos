import { ObjectId } from "mongodb";
import { connectPernalongaBot } from "../scripts/database.js";

export default async function handler(req, res) {
  // 🔹 CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // 🔹 URL moderna (remove warning DEP0169)
  const fullUrl = new URL(req.url, `http://${req.headers.host}`);
  const t = fullUrl.searchParams.get("t");

  if (!t) {
    return res.status(401).json({ error: "Token não informado" });
  }

  const db = await connectPernalongaBot();
  const produtos = db.collection("produtos");
  const users = db.collection("users");

  const user = await users.findOne({ token: t });

  if (!user) {
    return res.status(401).json({ error: "Token inválido" });
  }

  // 🔹 LISTAR PRODUTOS
  if (req.method === "GET") {
    const data = await produtos
      .find({ userId: user.userId})
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json(data);
  }

  // 🔹 CRIAR PRODUTO
  if (req.method === "POST") {
    const { nome, preco, desconto, link, imagem } = req.body;

    if (!nome || !link) {
      return res
        .status(400)
        .json({ error: "Nome e link são obrigatórios" });
    }

    await produtos.insertOne({
      nome,
      preco: preco || null,
      desconto: desconto || null,
      link,
      imagem: imagem || null,

      userId: user.userId,
      userName: user.name || "Usuário",
      createdBy: {
        name: user.name || "Desconhecido",
        whatsapp: user.whatsapp || "Desconhecido"
      },

      createdAt: new Date()
    });

    return res.status(201).json({ success: true });
  }

  // 🔹 EDITAR PRODUTO
  if (req.method === "PUT") {
    const id = fullUrl.searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const { nome, preco, desconto, link, imagem } = req.body;

    const update = {};
    if (nome !== undefined) update.nome = nome;
    if (preco !== undefined) update.preco = preco;
    if (desconto !== undefined) update.desconto = desconto;
    if (link !== undefined) update.link = link;
    if (imagem !== undefined) update.imagem = imagem;

    const result = await produtos.updateOne(
      { _id: new ObjectId(id), userId: user.userId },
      { $set: update }
    );

    if (!result.matchedCount) {
      return res
        .status(404)
        .json({ error: "Produto não encontrado" });
    }

    return res.status(200).json({ success: true });
  }

  // 🔹 DELETAR PRODUTO
  if (req.method === "DELETE") {
    const id = fullUrl.searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const result = await produtos.deleteOne({
      _id: new ObjectId(id),
      userId: user.userId
    });

    if (!result.deletedCount) {
      return res
        .status(404)
        .json({ error: "Produto não encontrado" });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Método não permitido" });
}
