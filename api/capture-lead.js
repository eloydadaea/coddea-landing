import { google } from 'googleapis';

export default async function handler(req, res) {
    // 1. Configuración de CORS nativa de Vercel
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permite pruebas desde cualquier origen
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar la petición "pre-flight" de seguridad del navegador
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Bloquear si no es POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        console.log("🚀 Petición recibida en Vercel");

        // Vercel convierte el body a JSON automáticamente
        const body = req.body;
        const { nombre, empresa, correo, telefono, mensaje } = body;
        const turnstileToken = body['cf-turnstile-response'];

        if (!turnstileToken) {
            console.error("❌ Falta el token de Turnstile");
            return res.status(400).json({ error: 'Verificación de seguridad ausente.' });
        }

        // --- VALIDACIÓN DE SEGURIDAD (CLOUDFLARE) ---
        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${process.env.CLOUDFLARE_TURNSTILE_SECRET}&response=${turnstileToken}`
        });
        const verifyData = await verifyRes.json();
        
        if (!verifyData.success) {
            console.error("❌ Cloudflare rechazó el token:", verifyData);
            return res.status(403).json({ error: 'Fallo en la verificación de seguridad (Bot detectado).' });
        }
        console.log("✅ Cloudflare validado correctamente");

        // --- GOOGLE SHEETS ---
        // .replace(/\\n/g, '\n') es vital para que Vercel lea bien tu Private Key
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Hoja 1!A:F', // Ojo: Asegúrate de que la pestaña se llame "Hoja 1"
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[
                    new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }),
                    nombre || '', 
                    empresa || 'No especificada', 
                    correo || '', 
                    telefono || 'No especificado', 
                    mensaje || ''
                ]],
            },
        });

        console.log("✅ Datos guardados en Sheets con éxito");
        return res.status(200).json({ success: true, message: '¡Gracias por escribirnos! Te contactaremos pronto.' });

    } catch (error) {
        console.error("❌ ERROR DETALLADO:", error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
}