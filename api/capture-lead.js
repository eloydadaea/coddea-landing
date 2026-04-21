import { google } from 'googleapis';

export async function handler(event) {
    // 1. Configuración de CORS
    const allowedOrigins = ['https://tudominio.com', 'http://localhost:3000', 'http://127.0.0.1:5500'];
    const origin = event.headers.origin || event.headers.Origin;

    const headers = {
        'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // 2. Extraer datos (incluyendo el token de Turnstile)
        const body = JSON.parse(event.body);
        const { nombre, empresa, correo, telefono, mensaje } = body;
        const turnstileToken = body['cf-turnstile-response']; // El token que genera el widget en el front

        // --- VALIDACIÓN DE SEGURIDAD (CLOUDFLARE) ---
        if (!turnstileToken) {
            return { 
                statusCode: 400, 
                headers, 
                body: JSON.stringify({ error: 'Verificación de seguridad ausente.' }) 
            };
        }

        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${process.env.CLOUDFLARE_TURNSTILE_SECRET}&response=${turnstileToken}`
        });

        const verifyData = await verifyRes.json();

        if (!verifyData.success) {
            return { 
                statusCode: 403, 
                headers, 
                body: JSON.stringify({ error: 'Fallo en la verificación de seguridad (Bot detectado).' }) 
            };
        }
        // --- FIN VALIDACIÓN CLOUDFLARE ---

        // 3. Sanitizar los datos para Google Sheets
        if (!nombre || !correo || !mensaje) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan campos obligatorios.' }) };
        }

        const sanitize = (str) => str ? str.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        const cleanData = {
            nombre: sanitize(nombre),
            empresa: sanitize(empresa) || 'No especificada',
            correo: correo.trim().toLowerCase(),
            telefono: sanitize(telefono) || 'No especificado',
            mensaje: sanitize(mensaje)
        };

        // 4. Autenticación con Google Cloud
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // 5. Escribir en Google Sheets
        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Hoja 1!A:F', 
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [
                    [
                        new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }),
                        cleanData.nombre,
                        cleanData.empresa,
                        cleanData.correo,
                        cleanData.telefono,
                        cleanData.mensaje
                    ]
                ],
            },
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: '¡Gracias por escribirnos! Te contactaremos pronto.' })
        };

    } catch (error) {
        console.error("Error en el proceso:", error);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: 'Error interno del servidor.' }) 
        };
    }
}