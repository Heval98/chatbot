require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const token = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;
const verifyToken = process.env.VERIFY_TOKEN;

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  const entry = req.body.entry?. [0];
  const changes = entry?.changes?. [0];
  const message = changes?.value?.messages?. [0];

  if (message) {
    const from = message.from;
    const text = message.text?.body?.toLowerCase();

    console.log('Mensaje recibido:', text);

    // Greeting message
    const greeting = '¡Hola! 👋 Somos Tres Esencias, muchas gracias por contactarnos. ';

    // Mapping keywords to responses
    const responses = [{
        keywords: ['horario'],
        reply: 'Nuestro horario de atención es de 9am a 6pm, lunes a viernes.'
      },
      {
        keywords: ['precio'],
        reply: 'Para conocer los precios, por favor indícanos el producto que te interesa.'
      },
      {
        keywords: ['ubicación'],
        reply: 'Estamos ubicados en Calle Ficticia 123, Ciudad Ejemplo.'
      },
      {
        keywords: ['ayuda'],
        reply: '¿En qué puedo ayudarte? Puedes preguntar por horario, precios o ubicación.'
      },
      {
        keywords: ['humano', 'asesor', 'persona', 'real', 'atención humana', 'hablar con humano'],
        reply: 'Te pondremos en contacto con un asesor en breve. Por favor espera...'
      }
    ];

    let reply = 'No entendí tu mensaje. ¿Puedes ser más específico?';
    let needsHuman = false;

    for (const {
        keywords,
        reply: r
      } of responses) {
      if (keywords.some(keyword => text.includes(keyword))) {
        reply = r;
        // Check if this is the "humano" flow
        if (keywords.includes('humano', 'asesor', 'persona', 'real', 'humana')) {
          needsHuman = true;
        }
        break;
      }
    }

    // Notify your team if human help is needed
    if (needsHuman) {
      // Replace this with your preferred notification method
      console.log(`⚠️ Usuario ${from} solicitó hablar con un humano. Mensaje: "${text}"`);
      // Example: sendEmailToTeam(from, text);
      // Example: sendSlackNotification(from, text);
    }

    // Quick reply buttons for certain keywords
    let replyPayload;
    // Helper function to remove accents
    function removeAccents(str) {
      return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    const normalizedText = removeAccents(text);

    if (['hola', 'menu', 'tardes', 'dias', 'noches'].some(word => normalizedText.includes(removeAccents(word)))) {
      replyPayload = {
        messaging_product: 'whatsapp',
        to: from,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: greeting + '¿Sobre qué tema necesitas información?'
          },
          action: {
            buttons: [{
                type: 'reply',
                reply: {
                  id: 'horario',
                  title: 'Horario'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'precio',
                  title: 'Precios'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'ubicacion',
                  title: 'Ubicación'
                }
              }
            ]
          }
        }
      };
    } else {
      replyPayload = {
        messaging_product: 'whatsapp',
        to: from,
        text: {
          body: greeting + reply
        }
      };
    }

    // Respond to the user
    try {
      await axios.post(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        replyPayload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error sending message:', error.response?.data || error.message);
    }
  }

  res.sendStatus(200);
});

module.exports = app;