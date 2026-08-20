import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { Server } from "socket.io";

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);   //Creates a Node.js HTTP server and attaches your Express app to it.

// Initialize Socket.IO server
const io = new Server(server, {
    cors: {
        origin: "https://your-chat-app.vercel.app",
        methods: ["GET", "POST"]
    }
});

// Store currently online users
// Format: { userId: socketId }
export const userSocketMap = {};

// Handle a new Socket.IO connection
io.on("connection", (socket) => {

    // Get the userId sent by the frontend during connection
    const userId = socket.handshake.query.userId;

    console.log("User Connected", userId);

    // If we received a userId, store its socket ID
    if (userId) {
        userSocketMap[userId] = socket.id;
    }

    // Send the list of currently online users
    // to all connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // -------- typing indicator relay --------
    // These don't store any state — they're just forwarded straight to
    // the intended recipient's socket, the same way a chat message is.
    socket.on("typing", ({ receiverId }) => {
        const receiverSocketId = userSocketMap[receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("typing", { senderId: userId });
        }
    });

    socket.on("stopTyping", ({ receiverId }) => {
        const receiverSocketId = userSocketMap[receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("stopTyping", { senderId: userId });
        }
    });

    // Handle when this user disconnects
    // "disconnect" is a built-in Socket.IO event.Socket.IO automatically triggers it when that particular socket connection is disconnected.
    socket.on("disconnect", () => {

        console.log("User Disconnected", userId);

        // Only clear the mapping if this disconnecting socket is still
        // the one on record for this user. Without this check, a user
        // with two live connections (two tabs, or an old connection
        // that hasn't fully closed yet) could have the *newer* entry
        // wiped out when the *older* one disconnects — making them show
        // up as offline even though they're still connected elsewhere.
        if (userSocketMap[userId] === socket.id) {
            delete userSocketMap[userId];
            io.emit("getOnlineUsers", Object.keys(userSocketMap));
        }
    });
});

// Middleware setup
app.use(express.json({ limit: "4mb" }));    //Allows Express to understand JSON data sent in requests.
// limit: "4mb" means the JSON request body can be up to 4 MB.
app.use(cors());

// routes setup
app.use("/api/status", (req, res) => { res.send("Server is live"); });
app.use("/api/auth",userRouter);
app.use("/api/messages",messageRouter)

await connectDB();

// Port
const PORT = process.env.PORT || 4000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});