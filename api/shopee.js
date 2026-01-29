import axios from "axios";
import crypto from "crypto";
import { connectPernalongaBot } from "../scripts/database.js";

// 🔹 Authorization Shopee
function gerarAuthorizationHeader(appId, secret, payload) {
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = JSON.stringify(payload);
    const factor = appId + timestamp + payloadString + secret;

    const signature = crypto.createHash("sha256").update(factor).digest("hex");

    return `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`;
}

function gerarPayload() {
    return {
        query: `
      query {
        productOfferV2 {
          nodes {
            productName
            price
            imageUrl
            productLink
            offerLink
            priceMin
            priceMax
            ratingStar
            priceDiscountRate
          }
        }
      }
    `,
    };
}

export default async function handler(req, res) {
    // 🔹 CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(204).end();

    const fullUrl = new URL(req.url, `http://${req.headers.host}`);
    const t = fullUrl.searchParams.get("t");

    if (!t) return res.status(401).json({ error: "Token necessário" });

    const db = await connectPernalongaBot();
    const users = db.collection("users");

    const user = await users.findOne({ token: t });
    if (!user) return res.status(401).json({ error: "Token inválido" });

    // ✅ POST: salva credenciais
    if (req.method === "POST") {
        const { shopeeApiUrl, appId, secret } = req.body || {};
        if (!shopeeApiUrl || !appId || !secret) {
            return res.status(400).json({
                error: "Campos obrigatórios: shopeeApiUrl, appId, secret",
            });
        }

        await users.updateOne(
            { _id: user._id },
            {
                $set: {
                    shopeeCred: {
                        shopeeApiUrl,
                        appId,
                        secret,
                        updatedAt: new Date(),
                    },
                },
            }
        );

        return res.status(200).json({ success: true });
    }

    // ✅ GET: busca produtos
    if (req.method === "GET") {
        const cred = user.shopeeCred;

        if (!cred?.shopeeApiUrl || !cred?.appId || !cred?.secret) {
            return res.status(200).json({ needsCred: true, produtos: [] });
        }

        const payload = gerarPayload();
        const authHeader = gerarAuthorizationHeader(cred.appId, cred.secret, payload);

        try {
            const response = await axios.post(cred.shopeeCred?.shopeeApiUrl || cred.shopeeApiUrl, payload, {
                headers: { "Content-Type": "application/json", Authorization: authHeader },
            });

            const nodes = response.data?.data?.productOfferV2?.nodes || [];

            const produtos = nodes.map((p) => ({
                nomeShopee: p.productName,
                preco: String(p.price ?? ""),
                desconto: p.priceDiscountRate,
                imagem: p.imageUrl,
                link: p.offerLink || p.productLink,
            }));

            return res.status(200).json({ needsCred: false, produtos });
        } catch (err) {
            console.error("❌ Erro Shopee:", err.response?.data || err.message);
            return res.status(200).json({
                needsCred: false,
                produtos: [],
                error: "Erro ao buscar produtos da Shopee",
            });
        }
    }

    return res.status(405).json({ error: "Método não permitido" });
}
