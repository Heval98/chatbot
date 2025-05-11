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
    const text = message.text?.body;

    console.log('Mensaje recibido:', text);

    // Respond to the user
    try {
      await axios.post(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        to: from,
        text: {
          body: `Hola, recibí tu mensaje: "${text}"`
        }
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error sending message:', error.response?.data || error.message);
    }
  }

  res.sendStatus(200);
});

// Export the app for Vercel
module.exports = app;