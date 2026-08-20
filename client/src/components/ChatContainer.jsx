import React, { useContext, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import assets from '../assets/assets'
import { formatMessageTime } from '../lib/utils'
import { ChatContext } from '../../context/ChatContext'
import { AuthContext } from '../../context/AuthContext'

const ChatContainer = () => {

    const { messages, selectedUser, setSelectedUser, sendMessage, getMessages, isTyping, sendTyping, stopTyping, isProfilePanelOpen, setIsProfilePanelOpen } = useContext(ChatContext)
    const { authUser, onlineUsers } = useContext(AuthContext)

    const scrollEnd = useRef()

    const [input, setInput] = useState('')

    // Guard against double-submit: true while a send request is in flight.
    const [isSending, setIsSending] = useState(false)

    // Small tick-mark icon shown under every message I've sent —
    // yellow for delivered, green for seen. A single check for
    // delivered, a double check for seen, matching common chat-app
    // conventions without relying on text labels of uneven length.
    const SeenTick = ({ seen }) => (
        <svg
            viewBox="0 0 16 16"
            className={`w-3.5 h-3.5 ${seen ? 'text-green-400' : 'text-yellow-400'}`}
            fill="none"
        >
            <path
                d="M1 8.5L4.5 12L9 5.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {seen && (
                <path
                    d="M5.5 8.5L9 12L15 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}
        </svg>
    )

    // Handle sending a text message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (input.trim() === "" || isSending) return null;

        setIsSending(true)
        try {
            await sendMessage({ text: input.trim() });
            setInput("")
            stopTyping()
        } finally {
            setIsSending(false)
        }
    }

    // Handle sending an image
    const handleSendImage = async (e) => {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith("image/")) {
            toast.error("select an image file")
            return;
        }

        if (isSending) return;

        const reader = new FileReader();

        reader.onloadend = async () => {
            setIsSending(true)
            try {
                await sendMessage({ image: reader.result })
                stopTyping()
            } finally {
                setIsSending(false)
                e.target.value = ""
            }
        }
        reader.readAsDataURL(file)
    }

    // Let the other person know we're typing. The indicator now persists
    // for as long as there's text in the box — it stops the moment the
    // message is sent (handled above) or the box is cleared (handled
    // here), instead of fading out after a fixed pause.
    const handleInputChange = (e) => {
        const value = e.target.value
        setInput(value)

        if (value.trim() === "") {
            stopTyping()
        } else {
            sendTyping()
        }
    }

    useEffect(() => {
        if (selectedUser) {
            getMessages(selectedUser._id)
        }
    }, [selectedUser])

    useEffect(() => {
        if (scrollEnd.current && messages) {
            scrollEnd.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages, isTyping])

    return selectedUser ? (
        <div className='h-full overflow-scroll relative backdrop-blur-lg'>

            <style>{`
                @keyframes typingWave {
                    0%, 60%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
                    30% { transform: translateY(-5px) scale(1.15); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .typing-dot {
                    animation: typingWave 1.1s ease-in-out infinite;
                }
                .typing-dot-sm {
                    animation: typingWave 1.1s ease-in-out infinite;
                }
            `}</style>

            {/* -------- header -------- */}
            <div className='flex items-center gap-3 py-3 mx-4 border-b border-stone-500'>

                <img
                    src={selectedUser.profilePic || assets.avatar_icon}
                    alt=""
                    className="w-8 rounded-full"
                />

                <div className='flex-1 flex flex-col'>
                    <p className='text-lg text-white flex items-center gap-2'>
                        {selectedUser.fullName}
                        {onlineUsers.includes(selectedUser._id) && (
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        )}
                    </p>
                    {isTyping && (
                        <span className='flex items-center gap-1.5 text-xs text-violet-300'>
                            typing
                            <span className='flex items-end gap-[3px] h-2'>
                                <span className='typing-dot-sm w-1 h-1 bg-violet-300 rounded-full' style={{ animationDelay: '0s' }}></span>
                                <span className='typing-dot-sm w-1 h-1 bg-violet-300 rounded-full' style={{ animationDelay: '0.15s' }}></span>
                                <span className='typing-dot-sm w-1 h-1 bg-violet-300 rounded-full' style={{ animationDelay: '0.3s' }}></span>
                            </span>
                        </span>
                    )}
                </div>

                <img
                    onClick={() => setSelectedUser(null)}
                    src={assets.arrow_icon}
                    alt=""
                    className='md:hidden max-w-7'
                />

                <img
                    onClick={() => setIsProfilePanelOpen((prev) => !prev)}
                    src={assets.help_icon}
                    alt=""
                    className='max-md:hidden max-w-5 cursor-pointer'
                />

            </div>

            {/* -------- chat area -------- */}
            <div className='flex flex-col h-[calc(100%-120px)] overflow-y-scroll p-3 pb-6'>

                {messages.map((msg) => (
                    <div
                        // clientId stays the same across the pending -> confirmed
                        // swap, so this element never remounts and the opacity
                        // transition below can actually animate
                        key={msg.clientId || msg._id}
                        className={`flex items-end gap-2 justify-end transition-opacity duration-500 ${msg.pending ? 'opacity-50' : 'opacity-100'} ${msg.senderId !== authUser._id && 'flex-row-reverse'}`}
                    >
                        {msg.image ? (
                            <div className='relative mb-8'>
                                <img
                                    src={msg.image}
                                    alt=""
                                    className='max-w-[230px] border border-gray-700 rounded-lg overflow-hidden'
                                />
                                {msg.pending && (
                                    <div className='absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg'>
                                        <div className='w-5 h-5 border-2 border-white/70 border-t-transparent rounded-full animate-spin'></div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p
                                className={`p-2 max-w-[200px] md:text-sm font-light rounded-lg mb-8 break-all bg-violet-500/30 text-white ${msg.senderId === authUser._id ? 'rounded-br-none' : 'rounded-bl-none'}`}
                            >
                                {msg.text}
                            </p>
                        )}

                        <div className="text-center text-xs">
                            <img
                                src={
                                    msg.senderId === authUser._id
                                        ? authUser?.profilePic || assets.avatar_icon
                                        : selectedUser?.profilePic || assets.avatar_icon
                                }
                                alt=""
                                className='w-7 rounded-full'
                            />
                            <p className='text-gray-500'>{formatMessageTime(msg.createdAt)}</p>

                            {/* delivered/seen tick — shown under every message I sent */}
                            {msg.senderId === authUser._id && !msg.pending && (
                                <div className='flex justify-center mt-0.5'>
                                    <SeenTick seen={msg.seen} />
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* typing indicator bubble */}
                {isTyping && (
                    <div className='flex items-end gap-2 justify-end flex-row-reverse animate-[fadeIn_0.25s_ease-out]'>
                        <img
                            src={selectedUser?.profilePic || assets.avatar_icon}
                            alt=""
                            className='w-7 rounded-full mb-8'
                        />
                        <div className='flex items-center gap-1.5 px-4 py-3 bg-violet-500/30 rounded-lg rounded-bl-none mb-8 shadow-[0_0_14px_rgba(167,139,250,0.35)]'>
                            <span className='typing-dot w-2 h-2 bg-white rounded-full' style={{ animationDelay: '0s' }}></span>
                            <span className='typing-dot w-2 h-2 bg-white rounded-full' style={{ animationDelay: '0.15s' }}></span>
                            <span className='typing-dot w-2 h-2 bg-white rounded-full' style={{ animationDelay: '0.3s' }}></span>
                        </div>
                    </div>
                )}

                <div ref={scrollEnd}></div>
            </div>

            {/* -------- bottom area -------- */}
            <div className='absolute bottom-0 left-0 right-0 flex items-center gap-3 p-3'>
                <div className='flex-1 flex items-center bg-gray-100/12 px-3 rounded-full'>
                    <input
                        onChange={handleInputChange}
                        value={input}
                        onKeyDown={(e) => e.key === "Enter" ? handleSendMessage(e) : null}
                        type="text"
                        placeholder="Send a message"
                        disabled={isSending}
                        className='flex-1 text-sm p-3 border-none rounded-lg outline-none text-white placeholder-gray-400 disabled:opacity-50'
                    />
                    <input
                        onChange={handleSendImage}
                        type="file"
                        id='image'
                        accept='image/png, image/jpeg'
                        disabled={isSending}
                        hidden
                    />
                    <label htmlFor="image" className={isSending ? 'pointer-events-none opacity-50' : ''}>
                        <img
                            src={assets.gallery_icon}
                            alt=""
                            className="w-5 mr-2 cursor-pointer"
                        />
                    </label>
                </div>
                <img
                    onClick={isSending ? undefined : handleSendMessage}
                    src={assets.send_button}
                    alt=""
                    className={`w-7 ${isSending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                />
            </div>

        </div>
    ) : (
        <div className='flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden'>

            <img
                src={assets.logo_icon}
                className='max-w-16'
                alt=""
            />

            <p className='text-lg font-medium text-white'>
                Chat anytime, anywhere
            </p>

        </div>
    )
}

export default ChatContainer
