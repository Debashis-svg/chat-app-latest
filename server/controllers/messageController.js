import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io,userSocketMap } from "../server.js"

// Get all users except the logged in user
export const getUsersForSidebar = async (req, res) => {
    try {
        const userId = req.user._id;

        const filteredUsers = await User.find({
            _id: { $ne: userId }
        }).select("-password");

        // Count number of messages not seen
        const unseenMessages = {};

        const promises = filteredUsers.map(async (user) => {
            // for each user,messages will hold an array of unseen message objects by userId
            const messages = await Message.find({ 
                senderId: user._id,
                receiverId: userId,
                seen: false
            });

            if (messages.length > 0) {
                unseenMessages[user._id] = messages.length;
            }
        });

        await Promise.all(promises);   // waits until all users' unread-message counts are calculated.

        res.json({
            success: true,
            users: filteredUsers,
            unseenMessages
        });

    } catch (error) {
        console.log(error.message);
        res.json({
            success: false,
            message: error.message
        });
    }
};

// Get all messages for selected user
export const getMessages = async (req, res) => {
    try {
        // Take the id property from req.params, but instead of creating a variable called id, create a variable called selectedUserId.
        const { id: selectedUserId } = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                {
                    senderId: myId,
                    receiverId: selectedUserId
                },
                {
                    senderId: selectedUserId,
                    receiverId: myId
                }
            ]
        });

        await Message.updateMany(
            {
                senderId: selectedUserId,
                receiverId: myId
            },
            {
                seen: true
            }
        );

        // Tell the sender, in real time, that everything they sent in
        // this conversation has now been seen — this is what lets the
        // "Seen" indicator update on their screen without a reload.
        const senderSocketId = userSocketMap[selectedUserId];
        if (senderSocketId) {
            io.to(senderSocketId).emit("messagesSeen", { by: myId });
        }

        res.json({
            success: true,
            messages
        });

    } catch (error) {
        console.log(error.message);
        res.json({
            success: false,
            message: error.message
        });
    }
};

// api to mark message as seen using message id
export const markMessageAsSeen = async (req, res) => {
    try {
        const { id } = req.params;

        const message = await Message.findByIdAndUpdate(id, { seen: true });

        // Notify the original sender, in real time, that this specific
        // message has now been seen.
        if (message) {
            const senderSocketId = userSocketMap[message.senderId];
            if (senderSocketId) {
                io.to(senderSocketId).emit("messageSeen", { messageId: id });
            }
        }

        res.json({ success: true });

    } catch (error) {
        console.log(error.message);

        res.json({
            success: false,
            message: error.message
        });
    }
};

// Send message to selected user
export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const receiverId = req.params.id;
        const senderId = req.user._id;

        let imageUrl;

        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = await Message.create({
            senderId,
            receiverId,
            text,
            image: imageUrl
        });

        // Emit the new message to the receiver's socket
        const receiverSocketId = userSocketMap[receiverId]; 

        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.json({
            success: true,
            newMessage
        });

    } catch (error) {
        console.log(error.message);

        res.json({
            success: false,
            message: error.message
        });
    }
};