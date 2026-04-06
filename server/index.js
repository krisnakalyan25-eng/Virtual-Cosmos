import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";




const app = express();
app.use(cors());

const server = http.createServer(app);

mongoose.connect('mongodb+srv://kalyankrishna587_db_user:Kalyan%40123@cluster0.vhq9mab.mongodb.net/?appName=Cluster0')
  .then(() => console.log("DB connected"))
  .catch(err => console.log(err));

const userSchema = new mongoose.Schema({
  socketId: String,
  name: String,
});

const User = mongoose.model("User", userSchema);

const io = new Server(server, {
  cors: { origin: "*" },
});

let users = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("typing", () => {
    const user = users[socket.id];

    if (!user) return;

    socket.broadcast.emit("userTyping", {
      id: socket.id,
      name: user.name,
    });
  });

  socket.on("stopTyping", () => {
    socket.broadcast.emit("userStopTyping");
  });

  // JOIN
  socket.on("join", async ({ name }) => {
    users[socket.id] = { name, x: 100, y: 100 };

    await User.create({ socketId: socket.id, name });

    socket.emit("allUsers", users);

    socket.broadcast.emit("newUser", {
      id: socket.id,
      ...users[socket.id],
    });


  });

  // MOVE
  socket.on("move", (pos) => {
    if (!users[socket.id]) return;

    users[socket.id].x = pos.x;
    users[socket.id].y = pos.y;

    socket.broadcast.emit("userMoved", {
      id: socket.id,
      ...users[socket.id],
    });
  });

  // CHAT (ONLY ONE HANDLER)
  socket.on("sendMessage", ({ message }) => {
    if (!users[socket.id]) return;

    const user = users[socket.id];

    io.emit("receiveMessage", {
      id: socket.id,
      name: user.name,
      message,
    });
  });

  // DISCONNECT
  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);

    delete users[socket.id];
    await User.deleteOne({ socketId: socket.id });

    socket.broadcast.emit("userLeft", socket.id);
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});