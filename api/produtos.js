import { ObjectId } from "mongodb";
import { connectPernalongaBot } from "../scripts/database.js";

export default async function handler(req, res) {
  // 🔹 CORS (Permite acesso de qualquer lugar)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // 🔹 URL moderna
  const fullUrl = new URL(req.url, `http://${req.headers.host}`);
  const t = fullUrl.searchParams.get("t");

  const db = await connectPernalongaBot();
  const produtos = db.collection("produtos");
  const users = db.collection("users");

  // 🔹 AUTENTICAÇÃO FLEXÍVEL
  // Tenta buscar o usuário se tiver token, mas NÃO trava o código ainda se não tiver.
  let user = null;
  if (t) {
    user = await users.findOne({ token: t });
    // Se enviou token mas ele é inválido, aí sim retorna erro.
    if (!user) {
      return res.status(401).json({ error: "Token inválido" });
    }
  }

  // ============================================================
  // 🔹 GET: LISTAR PRODUTOS (PÚBLICO OU PRIVADO)
  // ============================================================
  if (req.method === "GET") {
    // Parâmetros da URL
    const busca = fullUrl.searchParams.get("busca"); // Texto para regex
    const categoria = fullUrl.searchParams.get("categoria"); 
    
    // Inicia o filtro
    let filtro = {};

    // 🔒 LÓGICA DE VISIBILIDADE:
    // Se TEM usuário logado (token), mostra só os produtos dele (Dashboard).
    // Se NÃO TEM usuário (sem token), não filtra por ID (mostra tudo/Público).
    if (user) {
      filtro.userId = user.userId;
    }

    // 🔎 LÓGICA DE BUSCA (REGEX)
    // Funciona tanto logado quanto deslogado
    if (busca) {
      filtro.$or = [
        { nome: { $regex: busca, $options: "i" } }, // Procura no Nome
        { link: { $regex: busca, $options: "i" } }  // Procura no Link
      ];
    }

    // Filtro extra por categoria (opcional)
    if (categoria) {
      filtro.categoria = categoria;
    }

    // Busca no banco
    const data = await produtos
      .find(filtro)
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json(data);
  }

  // 🛑 DAQUI PARA BAIXO, TUDO REQUER LOGIN
  // Se tentar POST, PUT ou DELETE sem user, barra aqui.
  if (!user) {
    return res.status(401).json({ error: "Token necessário para esta operação" });
  }

  // 🔹 CRIAR PRODUTO (POST)
  if (req.method === "POST") {
    const { nome, preco, desconto, link, imagem, categoria } = req.body;

    if (!nome || !link) {
      return res.status(400).json({ error: "Nome e link são obrigatórios" });
    }

    await produtos.insertOne({
      nome,
      preco: preco || null,
      desconto: desconto || null,
      link,
      imagem: imagem || null,
      categoria: categoria || null,
      
      userId: user.userId,
      userName: user.name || "Usuário",
      createdBy: {
        name: user.name || "Desconhecido",
        whatsapp: user.userId || "Desconhecido"
      },
      createdAt: new Date()
    });

    return res.status(201).json({ success: true });
  }

  // 🔹 EDITAR PRODUTO (PUT)
  if (req.method === "PUT") {
    const id = fullUrl.searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) return res.status(400).json({ error: "ID inválido" });

    const { nome, preco, desconto, link, imagem, categoria } = req.body;

    const update = {};
    if (nome !== undefined) update.nome = nome;
    if (preco !== undefined) update.preco = preco;
    if (desconto !== undefined) update.desconto = desconto;
    if (link !== undefined) update.link = link;
    if (imagem !== undefined) update.imagem = imagem;
    if (categoria !== undefined) update.categoria = categoria;

    // Só edita se for o dono
    const result = await produtos.updateOne(
      { _id: new ObjectId(id), userId: user.userId },
      { $set: update }
    );

    if (!result.matchedCount) return res.status(404).json({ error: "Não encontrado ou sem permissão" });

    return res.status(200).json({ success: true });
  }

  // 🔹 DELETAR PRODUTO (DELETE)
  if (req.method === "DELETE") {
    const id = fullUrl.searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) return res.status(400).json({ error: "ID inválido" });

    // Só deleta se for o dono
    const result = await produtos.deleteOne({
      _id: new ObjectId(id),
      userId: user.userId
    });

    if (!result.deletedCount) return res.status(404).json({ error: "Não encontrado ou sem permissão" });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Método não permitido" });
}
