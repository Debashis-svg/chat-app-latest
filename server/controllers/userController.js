import User from "../models/User.js";
import bcrypt from "bcrypt";
import { generateToken } from "../lib/utils.js";
import cloudinary from "../lib/cloudinary.js";

// Signup a new user
export const signup = async (req, res) => {
    const { fullName, email, password, bio } = req.body;

    try {
        // Check if any required field is missing
        if (!fullName || !email || !password || !bio) {
            return res.json({
                success: false,
                message: "Missing Details"
            });
        }

        // Check if user already exists
        const user = await User.findOne({ email });

        if (user) {
            return res.json({
                success: false,
                message: "User already exists"
            });
        }

        // Generate salt (A salt is a random value added to a password before hashing)
        // assword123 + randomSalt → hash → XYZ789... 
        // Another user entering the same password gets a different salt, so they get a different hash.
        const salt = await bcrypt.genSalt(10);

        // Hash password using salt
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = await User.create({
            fullName,
            email,
            password: hashedPassword,
            bio
        });

        // Generate JWT token
        const token = generateToken(newUser._id);

        // Send response
        res.json({
            success: true,
            userData: newUser,
            token,
            message: "Account created successfully"
        });

    } catch (error) {
        console.log(error.message);

        res.json({
            success: false,
            message: error.message
        });
    }
};

// Controller to login a user
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const userData = await User.findOne({ email });

        const isPasswordCorrect = await bcrypt.compare(
            password,
            userData.password
        );

        if (!isPasswordCorrect) {
            return res.json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const token = generateToken(userData._id);

        res.json({
            success: true,
            userData,
            token,
            message: "Login successful"
        });

    } catch (error) {
        console.log(error.message);

        res.json({
            success: false,
            message: error.message
        });
    }
};

// controller to check if user is aurthenticated
export const checkAuth = (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
};

// Controller to update user profile details
export const updateProfile = async (req, res) => {
    try {
        const { profilePic, bio, fullName } = req.body;

        const userId = req.user._id;
        let updatedUser;

        if (!profilePic) {
            updatedUser = await User.findByIdAndUpdate(
                userId,
                { bio, fullName },
                { new: true }
            );
        } else {
            const upload = await cloudinary.uploader.upload(profilePic);

            updatedUser = await User.findByIdAndUpdate(
                userId,
                {
                    profilePic: upload.secure_url,
                    bio,
                    fullName
                },
                { new: true }
            );
        }

        res.json({
            success: true,
            user: updatedUser
        });

    } catch (error) {
        console.log(error.message);

        res.json({
            success: false,
            message: error.message
        });
    }
};