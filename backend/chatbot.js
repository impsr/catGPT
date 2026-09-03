import dotenv from "dotenv";
dotenv.config();

import readline from "node:readline/promises"

import Groq from "groq-sdk";
import {tavily} from "@tavily/core";

const tvly = tavily({ apiKey: process.env.TAVILY_SEARCH_API_KEY});
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generate(userMessage) {

    const messages = [
            {
                role : 'system',
                content : `You are a smart personal assistant who answers the asked questions.
                You have access to following tools:
                1. searchWeb({query}): {query: string}
                2. Current datetime: ${new Date().toUTCString()}`

            },
    ]    
    
    

        messages.push({
            role: 'user',
            content: userMessage
        });

        while(true){
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