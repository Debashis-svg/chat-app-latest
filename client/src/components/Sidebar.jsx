import React, { useContext, useEffect, useState } from 'react'
import assets from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'
import { ChatContext } from '../../context/ChatContext'

const Sidebar = () => {

    const { getUsers, users, selectedUser, setSelectedUser,
        unseenMessages, setUnseenMessages } = useContext(ChatContext);

    const { logout, onlineUsers } = useContext(AuthContext)

    // text currently typed in the search bar
    const [input, setInput] = useState("")

    const navigate = useNavigate();

    // State to control the logout confirmation popup
    const [showLogoutPopup, setShowLogoutPopup] = useState(false)

    // Live-filter the user list as the person types.
    // If the search box is empty, just show everyone.
    const filteredUsers = input
        ? users.filter((user) =>
            user.fullName.toLowerCase().includes(input.toLowerCase())
        )
        : users;

    // Refresh the user list whenever the online-users list changes,
    // so newly-online/offline users are reflected without a manual reload.
    useEffect(() => {
        getUsers();
    }, [onlineUsers])

    return (
        <div className={`bg-[#8185B2]/10 h-full p-5 rounded-r-xl overflow-y-scroll text-white ${selectedUser ? "max-md:hidden" : ''}`}>

            <div className='pb-5'>

                <div className='flex justify-between items-center'>

                    <img
                        src={assets.logo}
                        alt="logo"
                        className='max-w-40'
                    />

                    <div className="relative py-2 group">

                        <img
                            src={assets.menu_icon}
                            alt="Menu"
                            className='max-h-5 cursor-pointer'
                        />

                        <div className='absolute top-full right-0 z-20 w-32 p-5 rounded-md bg-[#282142] border border-gray-600 text-gray-100 hidden group-hover:block'>

                            <p
                                onClick={() => navigate('/profile')}
                                className='cursor-pointer text-sm'
                            >
                                Edit Profile
                            </p>

                            <hr className="my-2 border-t border-gray-500" />

                            <p
                                className='cursor-pointer text-sm'
                                onClick={() => setShowLogoutPopup(true)}
                            >
                                Logout
                            </p>

                        </div>

                    </div>

                </div>

            </div>

            {/* -------- search bar (real-time filter) -------- */}
            <div className='bg-[#282142] rounded-full flex items-center gap-2 py-3 px-4 mt-5'>

                <img
                    src={assets.search_icon}
                    alt="Search"
                    className='w-3'
                />

                <input
                    onChange={(e) => setInput(e.target.value)}
                    value={input}
                    type="text"
                    className='bg-transparent border-none outline-none text-white text-xs placeholder-[#c8c8c8] flex-1'
                    placeholder='Search User...'
                />

            </div>

            <div className='flex flex-col'>

                {filteredUsers.map((user, index) => (

                    <div
                        onClick={() => {
                            setSelectedUser(user)
                            // clear the unseen badge for this user once opened
                            setUnseenMessages((prev) => ({ ...prev, [user._id]: 0 }))
                        }}
                        key={index}
                        className={`relative flex items-center gap-2 p-2 pl-4 rounded cursor-pointer max-sm:text-sm ${selectedUser?._id === user._id && 'bg-[#282142]/50'}`}
                    >

                        <img
                            src={user?.profilePic || assets.avatar_icon}
                            alt=""
                            className='w-[35px] aspect-[1/1] rounded-full'
                        />

                        <div className='flex flex-col leading-5'>

                            <p>{user.fullName}</p>

                            {
                                onlineUsers.includes(user._id)
                                    ? <span className='text-green-400 text-xs'>Online</span>
                                    : <span className='text-neutral-400 text-xs'>Offline</span>
                            }

                        </div>

                        {
                            unseenMessages[user._id] > 0 && (
                                <p className='absolute top-4 right-4 text-xs h-5 w-5 flex justify-center items-center rounded-full bg-violet-500/50'>
                                    {unseenMessages[user._id]}
                                </p>
                            )
                        }

                    </div>

                ))}

            </div>

            {/* Logout Confirmation Popup */}
            {showLogoutPopup && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>

                    <div className='w-[90%] max-w-sm bg-[#282142] border border-gray-600 rounded-xl p-6 shadow-2xl'>

                        <h2 className='text-lg font-semibold text-white mb-2'>
                            Are you sure?
                        </h2>

                        <p className='text-sm text-gray-400 mb-6'>
                            Are you sure you want to logout from your account?
                        </p>

                        <div className='flex justify-end gap-3'>

                            {/* Cancel */}
                            <button
                                onClick={() => setShowLogoutPopup(false)}
                                className='px-4 py-2 rounded-md border border-gray-600 text-gray-300 hover:bg-gray-700 transition'
                            >
                                Cancel
                            </button>

                            {/* Logout */}
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

export default Sidebar
