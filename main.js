const http = require("http");
const express = require("express");
const app = express();

app.use(express.static("public"));
// require("dotenv").config();

const serverPort = process.env.PORT || 3000;
const server = http.createServer(app);
const WebSocket = require("ws");

let keepAliveId;

let isAccelDataSent = false;

const wss =
  process.env.NODE_ENV === "production"
    ? new WebSocket.Server({ server })
    : new WebSocket.Server({ port: 5001 });

server.listen(serverPort);
console.log(`Server started on port ${serverPort} in stage ${process.env.NODE_ENV}`);

wss.on("connection", function (ws, req) {
  console.log("Connection Opened");
  console.log("Client size: ", wss.clients.size);

  if (wss.clients.size === 1) {
    console.log("first connection. starting keepalive");
    keepServerAlive();
  }

  ws.on("message", (data) => {
    let stringifiedData = data.toString();
    let json_data = JSON.parse(data);
    if (stringifiedData === 'pong') {
      console.log('keepAlive');
      return;
    }else if(json_data.type === 'accelerationData'){
      isAccelDataSent = true;
    }
    broadcast(ws, stringifiedData, false);
  });

  ws.on("close", (data) => {
    console.log("closing connection");

    isAccelDataSent = false;

    if (wss.clients.size === 0) {
      console.log("last client disconnected, stopping keepAlive interval");
      clearInterval(keepAliveId);
    }
  });
});

// Implement broadcast function because of ws doesn't have it
const broadcast = (ws, message, includeSelf) => {
  if (includeSelf) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  } else {
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
};

// Function to generate a random ID
function generateRandomId(length = 8) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Sends a ping message to all connected clients every 50 seconds
 */
 const keepServerAlive = () => {
  keepAliveId = setInterval(() => {
    if(!isAccelDataSent){
          wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        const randomId = generateRandomId();
        const message = JSON.stringify({type: "keepAlive", id: randomId, x:16, y:0, z:0,select:0});
        client.send(message);
      }
    });
    }
  }, 10000);
};


app.get('/', (req, res) => {
    res.send('Hello World!');
});
