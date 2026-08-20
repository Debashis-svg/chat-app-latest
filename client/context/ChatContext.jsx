import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "./AuthContext";
import { toast } from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {

    const [messages, setMessages] = useState([]);              // Holds messages of the currently selected chat
    const [users, setUsers] = useState([]);                    // Holds the list of all users
    const [selectedUser, setSelectedUser] = useState(null);    // Holds the user whose chat is currently selected
    const [unseenMessages, setUnseenMessages] = useState({});  // Holds the count of unread messages for each user
    const [isTyping, setIsTyping] = useState(false);           // Is the selected user currently typing?
    const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false); // Is the right-side info/profile panel open?

    const { socket, axios, authUser } = useContext(AuthContext);

    const typingSafetyTimeoutRef = useRef(null);

    // Reset chat state whenever the logged-in user changes. ChatProvider
    // sits above the router, so it never unmounts between LoginPage and
    // HomePage — without this, logging out and logging back in on the
    // same tab would leave the previous session's selectedUser sitting
    // in context, and the old conversation would pop straight open the
    // moment HomePage mounts again.
    useEffect(() => {
        setSelectedUser(null);
        setMessages([]);
        setUsers([]);
        setUnseenMessages({});
        setIsTyping(false);
        setIsProfilePanelOpen(false);
    }, [authUser]);

    // Add a message to state only if it isn't already there — protects
    // against ever appending the same message twice (flaky reconnect,
    // a socket event replaying, etc).
    const addMessageIfNew = (newMessage) => {
        setMessages((prev) =>
            prev.some((m) => m._id === newMessage._id) ? prev : [...prev, newMessage]
        );
    };

    // Function to get all users for sidebar
    const getUsers = async () => {
        try {
            const { data } = await axios.get("/api/messages/users");

            if (data.success) {
                setUsers(data.users);
                setUnseenMessages(data.unseenMessages);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Function to get messages for selected user
    const getMessages = async (userId) => {
        try {
            const { data } = await axios.get(`/api/messages/${userId}`);

            if (data.success) {
                setMessages(data.messages);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    // Function to send message to selected user
    const sendMessage = async (messageData) => {

        // Give this message a client-side id so we can render it
        // immediately — before the server responds — instead of the
        // person staring at nothing while an image uploads. Once the
        // real message comes back we swap it in, keeping the same
        // clientId as the React key so the element doesn't remount and
        // the pending -> sent transition can animate smoothly.
        const clientId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const optimisticMessage = {
            _id: clientId,
            clientId,
            senderId: authUser._id,
            receiverId: selectedUser._id,
            text: messageData.text || "",
            image: messageData.image || "",
            seen: false,
            createdAt: new Date().toISOString(),
            pending: true,
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        try {
            const { data } = await axios.post(
                `/api/messages/send/${selectedUser._id}`,
                messageData
            );

            if (data.success) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.clientId === clientId
                            ? { ...data.newMessage, clientId }
                            : m
                    )
                );
            } else {
                toast.error(data.message);
                setMessages((prev) => prev.filter((m) => m.clientId !== clientId));
            }
        } catch (error) {
            toast.error(error.message);
            // roll back the optimistic message since the send actually failed
            setMessages((prev) => prev.filter((m) => m.clientId !== clientId));
        }
    };

    // Call this from the message input's onChange, on every keystroke,
    // while there's still text in the box.
    const sendTyping = () => {
        if (!socket || !selectedUser) return;

        socket.emit("typing", { receiverId: selectedUser._id });

        // Safety net only — this is NOT how the indicator normally
        // clears. Normally it's cleared by an explicit stopTyping()
        // call (message sent, or the input emptied). This timeout just
        // protects the other person from staring at "typing..." forever
        // if something goes wrong (tab closed, crash, lost connection)
        // before stopTyping() ever fires.
        if (typingSafetyTimeoutRef.current) clearTimeout(typingSafetyTimeoutRef.current);
        typingSafetyTimeoutRef.current = setTimeout(() => {
            socket.emit("stopTyping", { receiverId: selectedUser._id });
        }, 8000);
    };

    // Call this explicitly when the typing indicator should actually
    // stop: the message was sent, or the input was cleared.
    const stopTyping = () => {
        if (!socket || !selectedUser) return;

        if (typingSafetyTimeoutRef.current) {
            clearTimeout(typingSafetyTimeoutRef.current);
            typingSafetyTimeoutRef.current = null;
        }
        socket.emit("stopTyping", { receiverId: selectedUser._id });
    };

    // Function to subscribe to messages for selected user
    const subscribeToMessages = async () => {

        if (!socket) return;
        // Socket, whenever a newMessage event comes from the server, tell me about it.
        socket.on("newMessage", (newMessage) => {

            if (
                selectedUser &&
                newMessage.senderId === selectedUser._id
            ) {
                newMessage.seen = true;

                addMessageIfNew(newMessage);

                axios.put(`/api/messages/mark/${newMessage._id}`);

            } else {

                setUnseenMessages((prevUnseenMessages) => ({
                    ...prevUnseenMessages,
                    [newMessage.senderId]:
                        prevUnseenMessages[newMessage.senderId]
                            ? prevUnseenMessages[newMessage.senderId] + 1
                            : 1
                }));
            }
        });

        // -------- typing indicator --------
        socket.on("typing", ({ senderId }) => {
            if (selectedUser && senderId === selectedUser._id) {
                setIsTyping(true);
            }
        });

        socket.on("stopTyping", ({ senderId }) => {
            if (selectedUser && senderId === selectedUser._id) {
                setIsTyping(false);
            }
        });

        // -------- read receipts --------
        // fired when one specific message of ours gets seen
        socket.on("messageSeen", ({ messageId }) => {
            setMessages((prev) =>
                prev.map((m) => (m._id === messageId ? { ...m, seen: true } : m))
            );
        });

        // fired when the other user opens the chat and everything we'd
        // sent them gets marked seen in bulk
        socket.on("messagesSeen", ({ by }) => {
            setMessages((prev) =>
                prev.map((m) => (m.receiverId === by ? { ...m, seen: true } : m))
            );
        });

        // resync on reconnect: if the socket dropped and came back,
        // pull the latest messages via REST so nothing missed while
        // offline is silently lost.
        socket.on("connect", () => {
            if (selectedUser) {
                getMessages(selectedUser._id);
            }
        });
    };

    // Function to unsubscribe from messages
    const unsubscribeFromMessages = () => {
        if (socket) {
            socket.off("newMessage");
            socket.off("typing");
            socket.off("stopTyping");
            socket.off("messageSeen");
            socket.off("messagesSeen");
            socket.off("connect");
        }
    };

    useEffect(() => {
        subscribeToMessages();

        return () => unsubscribeFromMessages();

    }, [socket, selectedUser]);

    // reset the typing indicator whenever the open chat changes, so it
    // doesn't carry over from whoever you were previously talking to
    useEffect(() => {
        setIsTyping(false);
        // also close the info panel when switching chats, so it doesn't
        // stay open showing the previous person's profile
        setIsProfilePanelOpen(false);
    }, [selectedUser]);

    // if we switch away from a chat (or close the app) while our own
    // typing signal is still active, let that person know we've stopped
    // — otherwise they'd be stuck seeing "typing..." indefinitely
    useEffect(() => {
        return () => {
            if (socket && selectedUser) {
                socket.emit("stopTyping", { receiverId: selectedUser._id });
            }
            if (typingSafetyTimeoutRef.current) {
                clearTimeout(typingSafetyTimeoutRef.current);
            }
        };
    }, [socket, selectedUser]);

    const value = {
        messages,
        users,
        selectedUser,
        getUsers,
        getMessages,
        sendMessage,
        setSelectedUser,
        unseenMessages,
        setUnseenMessages,
        isTyping,
        sendTyping,
        stopTyping,
        isProfilePanelOpen,
        setIsProfilePanelOpen,
    };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};
