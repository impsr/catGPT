import dotenv from "dotenv";
dotenv.config();

import readline from "node:readline/promises"

import Groq from "groq-sdk";
import {tavily} from "@tavily/core";
import  NodeCache from 'node-cache';


const tvly = tavily({ apiKey: process.env.TAVILY_SEARCH_API_KEY});
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const cache = new NodeCache({stdTTL: 60 * 60 * 24}); //24 HRS LATER DATA WILL BE CLEARED
 
export async function generate(userMessage, threadId) {

    const baseMessages = [
            {
                role : 'system',
                content : `You are a smart personal assistant who answers the asked questions.
                        If you know the answer to a question, answer it directly in plain English. 
                        If the answer requires real-time, local, or up-to-date information, or if you don’t know the answer, use the available tools to find it.
                        You have access to the following tool:
                            webSearch(query: string): Use this to search the internet for current or unknown information.
                        Decide when to use your own knowledge and when to use the tool.
                        Do not mention the tool unless needed.

                        Examples:
                        
                        Q: What is the capital of France?
                        A: The capital of France is Paris.
                        
                        Q: What’s the weather in Mumbai right now?
                        A: (use the search tool to find the latest weather).
                        
                        Current datetime: ${new Date().toUTCString()}`
            },
    ];
    
    
    const messages = cache.get(threadId) ?? baseMessages;
    
    
        messages.push({
            role: 'user',
            content: userMessage
        });

        const MAX_RETRIES = 10;
        let count = 0;


        while(true){

            if(count > MAX_RETRIES ){
                return "I Could not find the result , please try again!";
            }

            count++;
            
            const completion = await groq.chat.completions.create({
                model: 'openai/gpt-oss-120b',
                temperature: 0,
                messages: messages,
                tools: [  
                    {
                        type: "function",
                        function: {
                            name: "webSearch",
                            description: "Search the latest information and realtime data on the internet ",
                            parameters: {
                                type: "object",
                                properties: {
                                    query: {
                                        type: "string",
                                        description: "The search query to perform search on"
                                    },
                                },
                                required: ["query"]
                            }
                        }
                    }
                ],

                tool_choice : 'auto'       
            });

            messages.push(completion.choices[0].message);
            const toolCalls = completion.choices[0].message.tool_calls;

            if(!toolCalls){

                cache.set(threadId, messages);
                console.log(cache);
                return completion.choices[0].message.content;
            }

            for(const tool of toolCalls){
                const functionName = tool.function.name;
                const functionParams = tool.function.arguments;

                if(functionName === "webSearch"){
                    const toolResult = await webSearch(JSON.parse(functionParams));

                    messages.push({
                        tool_call_id: tool.id,
                        role: "tool",
                        name: functionName,
                        content: toolResult
                    });
                }
            }

        }

    }

async function webSearch({query}){
    console.log("Calling web search tool");

    const response = await tvly.search(query);

    const finalResult = response.results.map((result) => result.content).join("\n\n");

    return finalResult;
}