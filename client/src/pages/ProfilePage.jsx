import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import assets from '../assets/assets'
import { useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'

const ProfilePage = () => {

    const { authUser, updateProfile } = useContext(AuthContext)

    const [selectedImg, setSelectedImg] = useState(null)
    const navigate = useNavigate()

    const [name, setName] = useState(authUser.fullName)
    const [bio, setBio] = useState(authUser.bio)

    // Tracks whether a save request is currently in flight,
    // so we can disable the button and block duplicate submits
    const [isUpdating, setIsUpdating] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Guard: ignore extra clicks/submits while a request is already running
        if (isUpdating) return

        setIsUpdating(true)

        try {
            // If no image is selected, update only name and bio
            if (!selectedImg) {
                await updateProfile({ fullName: name, bio })
                navigate('/')
                return
            }

            // Create a FileReader object to read the selected image
            const reader = new FileReader()

            // Convert the selected image into a Base64 string
            reader.readAsDataURL(selectedImg)

            // This runs after the image has been completely read
            reader.onload = async () => {

                // reader.result contains the Base64 encoded image
                const base64Image = reader.result

                try {
                    // Send the image, name and bio to the backend
                    await updateProfile({
                        profilePic: base64Image,
                        fullName: name,
                        bio
                    })

                    // Go back to the home page after updating
                    navigate('/')
                } finally {
                    // Re-enable the button whether the update succeeded or failed
                    setIsUpdating(false)
                }
            }

            // If reading the file itself fails, don't leave the button stuck disabled
            reader.onerror = () => {
                setIsUpdating(false)
            }
        } catch (error) {
            // Covers the no-image branch (or any sync error before the reader path)
            setIsUpdating(false)
        }
    }

    return (
        <div className='min-h-screen bg-cover bg-no-repeat flex items-center justify-center'>

            <div className='w-5/6 max-w-2xl backdrop-blur-2xl text-gray-300 border-2 border-gray-600 flex items-center justify-between max-sm:flex-col-reverse rounded-lg'>

                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-5 p-10 flex-1"
                >

                    <h3 className="text-lg">
                        Profile details
                    </h3>

                    {/* Profile image */}
                    <label
                        htmlFor="avatar"
                        className='flex items-center gap-3 cursor-pointer'
                    >

                        <input
                            onChange={(e) => setSelectedImg(e.target.files[0])}
                            type="file"
                            id="avatar"
                            accept=".png, .jpg, .jpeg"
                            hidden
                        />

                        <img
                            src={
                                selectedImg
                                    ? URL.createObjectURL(selectedImg)
                                    : assets.avatar_icon
                            }
                            alt=""
                            className={`w-12 h-12 ${selectedImg && 'rounded-full'} `}
                        />

                        upload profile image

                    </label>

                    {/* Name */}
                    <input
                        onChange={(e) => setName(e.target.value)}
                        value={name}
                        type="text"
                        required
                        placeholder='Your name'
                        className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500'
                    />

                    {/* Bio */}
                    <textarea
                        onChange={(e) => setBio(e.target.value)}
                        value={bio}
                        placeholder="Write profile bio"
                        required
                        className="p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                        rows={4}
                    ></textarea>

                    {/* Save button */}
                    <button
                        type="submit"
                        disabled={isUpdating}
                        className={`bg-gradient-to-r from-purple-400 to-violet-600 text-white p-2 rounded-full text-lg ${isUpdating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        {isUpdating ? "Updating..." : "Update"}
                    </button>

                </form>

                {/* Logo */}
                <img
                    className={`max-w-44 aspect-square rounded-full mx-10 max-sm:mt-10 ${selectedImg && 'rounded-full'}`}
                    src={authUser?.profilePic || assets.logo_icon}
                    alt=""
                />

            </div>

        </div>
    )
}

export default ProfilePage
