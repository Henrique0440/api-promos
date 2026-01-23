import { connectPernalongaBot } from "../scripts/database.js";

export default async function handler(req, res) {
  // 🔹 1. CORS (Igual ao seu arquivo original)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  // 🔹 2. Conexão e Collections
  const db = await connectPernalongaBot();
  const statusCollection = db.collection("system_status");
  const usersCollection = db.collection("users");

  // 🔹 3. Pega o Token da URL
  const fullUrl = new URL(req.url, `http://${req.headers.host}`);
  const t = fullUrl.searchParams.get("t");

  try {
    // --- BUSCA 1: STATUS DO BOT E QR CODE ---
    const botStatus = await statusCollection.findOne({ _id: "bot_whatsapp" });

    // --- BUSCA 2: DADOS DO USUÁRIO (Se tiver token) ---
    let userData = null;
    let tokenValido = false;

    if (t) {
      const user = await usersCollection.findOne({ token: t });
      
      if (user) {
        tokenValido = true;
        userData = {
          userId: user.userId,
          name: user.name,
          admin: user.admin || false
        };
      }
    }

    // 🔹 4. RETORNO UNIFICADO
    return res.status(200).json({
      bot: {
        status: botStatus?.status || "desconhecido",
        qrCode: botStatus?.qrCode || null,
        updatedAt: botStatus?.updatedAt || null
      },
      user: userData,
      tokenValido: tokenValido
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro interno ao buscar status" });
  }
}