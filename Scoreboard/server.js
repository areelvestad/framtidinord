const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// Create an HTTP server
const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, req.url === '/' ? 'Scoreboard control.html' : req.url);

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
        } else {
            let contentType = 'text/html';
            if (filePath.endsWith('.css')) contentType = 'text/css';
            if (filePath.endsWith('.js')) contentType = 'application/javascript';

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
});

// Attach WebSocket server to the HTTP server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('message', (message) => {
        console.log(`Received: ${message}`);
        // Broadcast the message to all clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
});

// Start the server on port 8080
server.listen(8080, () => {
    console.log('Server running at http://localhost:8080/');
});
