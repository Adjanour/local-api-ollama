import express from 'express';
import cors from 'cors';
import ollama from 'ollama';
import requestIp from 'request-ip';


const app = express();

// Trust the first proxy
app.set('trust proxy', true);

app.use(cors({
    origin: '*',
}));

app.use(express.json());

app.use(requestIp.mw()); // Automatically extracts the client's IP

// middleware to track all incoming requests and users
app.use((req, res, next) => {
    console.log(`Request: ${req.method} ${req.originalUrl} - IP: ${req.clientIp}`);
    next();
});

app.post("/stream", async (req, res) => {
    const { prompt } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
        const message = { role: 'user', content: prompt };
        const response = await ollama.chat({ model: 'llama3.2:1b', messages: [message], stream: true });

        // Stream each message part as a JSON object
        for await (const part of response) {
            const messageData = {
                role: 'assistant',
                content: part.message.content
            };
            console.log(messageData);
            res.write(`data: ${JSON.stringify(messageData)}\n\n`);
        }

        // End of stream message
        res.write(`data: ${JSON.stringify({ content: "[DONE]" })}\n\n`);
        res.end();
    } catch (error) {
        console.error("Stream error:", error);
        res.write(`data: ${JSON.stringify({ error: "An error occurred during streaming" })}\n\n`);
        res.end();
    }
});


app.listen(3000, () => console.log("Server running on port 3000"));
