import { connectPernalongaBot } from "../scripts/database.js";

export default async function handler(req, res) {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

    const db = await connectPernalongaBot();
    const statusCollection = db.collection("system_status");
    const usersCollection = db.collection("users");

    const fullUrl = new URL(req.url, `http://${req.headers.host}`);
    const t = fullUrl.searchParams.get("t"); // Agora vai chegar valor aqui!

    try {
        const botStatus = await statusCollection.findOne({ _id: "bot_whatsapp" });

        let userData = null;
        let tokenValido = false;

        if (t) {
            const user = await usersCollection.findOne({ token: t });

            if (user) {
                tokenValido = true;
                
                // Se você quer liberar SÓ para aquele token específico, use assim:
                // if (user.token === "206828f0a02456284bac2236399bf205081cc53d745b63d3f5bd050ae54ae1e8") { tokenValido = true; }

                if (tokenValido) {
                    userData = {
                        userId: user.userId,
                        name: user.name,
                        admin: user.admin || false
                    };
                }
            }
        }

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
