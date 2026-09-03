import express from 'express';
const app = express();
const port = 3001;

import {generate} from './chatbot.js';

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to CatGPT')
});



app.post('/chat', async (req, res) =>{
    const {message}  = req.body;

    console.log('Message', message);

    const result = await generate(message);

    res.json({message: result});
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`)
});