import express from 'express';
import cors from 'cors'
import {generate} from './chatbot.js';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to CatGPT')
});

app.post('/chat', async (req, res) =>{
    const {message, threadId}  = req.body;

    if(!message || !threadId ){
      return res.status(400).json({message: 'All Fields are required!'}); 
    }
    const result = await generate(message, threadId);

    res.json({message: result});
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`)
});