import { google } from 'googleapis';

export async function handler(event) {
    console.log("Evento recibido en el Back");

    const headers = {
        'Access-Control-Allow-Origin': '*', // Permitir todo para testear
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const body = JSON.parse(event.body);
        console.log("Cuerpo de la petición procesado");

        const turnstileToken = body['cf-turnstile-response'];

        if (!turnstileToken) {
            console.error("Falta el token de Turnstile");
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta validación bot' }) };
        }

        // VALIDACIÓN CLOUDFLARE
        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${process.env.CLOUDFLARE_TURNSTILE_SECRET}&response=${turnstileToken}`
        });
        const verifyData = await verifyRes.json();
        
        if (!verifyData.success) {
            console.error("Cloudflare rechazó el token:", verifyData);
            return { statusCode: 403, headers, body: JSON.stringify({ error: 'Validación bot fallida' }) };
        }

        console.log("Cloudflare validado correctamente");

        // GOOGLE SHEETS
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
            range: 'Hoja 1!A:F', 
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[
                    new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }),
                    body.nombre, body.empresa, body.correo, body.telefono, body.mensaje
                ]],
            },
        });

        console.log("Datos guardados en Sheets con éxito");

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: '¡Recibido!' })
        };

    } catch (error) {
        console.error("ERROR DETALLADO:", error.message);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: error.message }) 
        };
    }
}