// server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let userIds = []; // Initialize an empty array to store user IDs

io.on("connection", (socket) => {
  console.log("A user connected");

  // Emit the user IDs to the connected client immediately after connection
  io.emit("userIds", userIds);

  // Add the new user ID to the array when a user joins
  userIds.push(socket.id);

  // Emit updated user IDs to all clients when a new user joins
  io.emit("userIds", userIds);

  socket.on("message", (msg) => {
    console.log("Message received:", msg);
    io.emit("message", msg); // Broadcast the message to all connected clients

    // Log the message sent by the server
    const clientId = socket.id;
    console.log(`Message sent to client ${clientId}:`, msg);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");

    // Remove the disconnected user ID from the array
    userIds = userIds.filter(id => id !== socket.id);

    // Emit updated user IDs to all clients when a user disconnects
    io.emit("userIds", userIds);
  });
});

const PORT = process.env.PORT || 5555;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
