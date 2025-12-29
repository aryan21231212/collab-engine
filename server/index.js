const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

let documentText = ""; // shared state

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Send current document to new user
  socket.emit("document:init", documentText);
  
  socket.on("operation", (op) => {
    // Broadcast operation to others
    socket.broadcast.emit("operation", op);
  });

  // Receive text updates
  socket.on("document:update", (newText) => {
    documentText = newText;
    socket.broadcast.emit("document:update", newText);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(3001, () => {
  console.log("Server running on port 3001");
});
