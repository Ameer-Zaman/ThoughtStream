const mongoose = require("mongoose");

const connectDB = async () => {
    try{
        await mongoose.connect(process.env.MONGO_URI); 
        // This is the actual Connection
        // process.env.MONGO_URI takes the value from the .env file

        console.log("MongoDB Connected Successfully");
    } catch(error){
        console.error(error);
        process.exit(1); // Stop the server 
    }
}

module.exports = connectDB;