import React, { useContext, useEffect, useState } from 'react'
import assets from '../assets/assets'
import { AuthContext } from '../../context/AuthContext'
import { ChatContext } from '../../context/ChatContext'

const RightSidebar = () => {

    // Get selected user and messages from ChatContext
    const { selectedUser, messages } = useContext(ChatContext)

    // Get logout function and online users from AuthContext
    const { logout, onlineUsers } = useContext(AuthContext)

    // Store only the images from messages
    const [msgImages, setMsgImages] = useState([])

    // State to control the logout confirmation popup
    const [showLogoutPopup, setShowLogoutPopup] = useState(false)


    // Get all images from the messages
    useEffect(() => {

        setMsgImages(
            messages
                .filter(msg => msg.image)
                .map(msg => msg.image)
        )

    }, [messages])


    return selectedUser && (

        <div className={`bg-[#8185B2]/10 text-white w-full relative overflow-y-scroll ${
            selectedUser ? "max-md:hidden" : ""
        }`}>

            {/* ---------------- USER PROFILE ---------------- */}

            <div className='pt-16 flex flex-col items-center gap-2 text-xs font-light mx-auto'>

                <img
                    src={selectedUser?.profilePic || assets.avatar_icon}
                    alt=""
                    className='w-20 aspect-[1/1] rounded-full'
                />

                <h1 className='px-10 text-xl font-medium mx-auto flex items-center gap-2'>

                    {/* Show green dot if user is online */}
                    {onlineUsers.includes(selectedUser._id) && (
                        <p className='w-2 h-2 rounded-full bg-green-500'></p>
                    )}

                    {selectedUser.fullName}

                </h1>

                <p className='px-10 mx-auto'>
                    {selectedUser.bio}
                </p>

            </div>


            {/* ---------------- MEDIA ---------------- */}

            <hr className="border-[#ffffff50] my-4" />

            <div className="px-5 text-xs">

                <p>Media</p>

                <div className='mt-2 max-h-[200px] overflow-y-scroll grid grid-cols-2 gap-4 opacity-80'>

                    {/* Display images from messages */}
                    {msgImages.map((url, index) => (

                        <div
                            key={index}
                            onClick={() => window.open(url)}
                            className='cursor-pointer rounded'
                        >

                            <img
                                src={url}
                                alt=""
                                className='h-full rounded-md'
                            />

                        </div>

                    ))}

                </div>

            </div>


            {/* ---------------- LOGOUT BUTTON ---------------- */}

            <button
                onClick={() => setShowLogoutPopup(true)}
                className='absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-400 to-violet-600 text-white border-none text-sm font-light py-2 px-20 rounded-full cursor-pointer'
            >
                Logout
            </button>


            {/* ---------------- LOGOUT CONFIRMATION POPUP ---------------- */}

            {showLogoutPopup && (

                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>

                    <div className='w-[90%] max-w-sm bg-[#282142] border border-gray-600 rounded-xl p-6 shadow-2xl'>

                        {/* Popup title */}
                        <h2 className='text-lg font-semibold text-white mb-2'>
                            Are you sure?
                        </h2>

                        {/* Popup message */}
                        <p className='text-sm text-gray-400 mb-6'>
                            Are you sure you want to logout from your account?
                        </p>


                        <div className='flex justify-end gap-3'>

                            {/* Cancel button */}
                            <button
                                onClick={() => setShowLogoutPopup(false)}
                                className='px-4 py-2 rounded-md border border-gray-600 text-gray-300 hover:bg-gray-700 transition'
                            >
                                Cancel
                            </button>


                            {/* Confirm Logout button */}
                            <button
                                onClick={() => {
                                    setShowLogoutPopup(false)
                                    logout()
                                }}
                                className='px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition'
                            >
                                Logout
                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>
    )
}

export default RightSidebar