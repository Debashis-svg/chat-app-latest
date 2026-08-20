import mongoose from "mongoose";

// Function to connect to the MongoDB database
export const connectDB = async () => {
    try {
        //It basically tells Mongoose: "Whenever you successfully become connected to MongoDB, execute this function."
        mongoose.connection.on("connected", () =>
            console.log("Database Connected")
        );

        await mongoose.connect(
            `${process.env.MONGODB_URI}/chat-app-two`
        );

    } catch (error) {
        console.log(error);
    }
};