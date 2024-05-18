import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { v2 as cloudinary } from "cloudinary";
import { getBase64, getSockets } from "../lib/helper.js";

const cookieOptions = {
  maxAge: 15 * 24 * 60 * 60 * 1000,
  sameSite: true,
  httpOnly: true,
  secure: true,
};

const connectDB = async (uri) => {
  try {
    const db = await mongoose.connect(uri, { dbName: "chattu" });
    console.log("Data Base Connected");
  } catch (error) {
    console.log("Data Base Connection Error in features js: ", error);
    throw new error();
  }
};

const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);

  return res.status(code).cookie("chattuToken", token, cookieOptions).json({
    success: true,
    message,
    user
  });
};

const emitEvent = (req, event, users, data) => {
    let io = req.app.get("io");
    const userSockets = getSockets(users);
    io.to(userSockets).emit(event, data);
};


const uploadFilesToCloudinary = async (files=[]) => {
    const uploadPromises = files.map((file) => {
        return new Promise((resolve, reject) => {
           cloudinary.uploader.upload(getBase64(file), {
            resource_type: "auto",
            public_id: uuid()
           },

           (error, result) => {
            if(error) return reject(error);
            resolve(result)
           }
        ) 
        })
    })

    try {
        const results = await Promise.all(uploadPromises);

        const formattedResults = results.map((result) => ({
            public_id: result.public_id,
            url: result.secure_url,
        }))

        return formattedResults
    } catch (error) {
        throw new Error("Error while uploading files on cloudinary: ", error)
    }
}

const deletesFilesFromColudinary = async (public_ids) => {};

export {
  connectDB,
  sendToken,
  cookieOptions,
  emitEvent,
  deletesFilesFromColudinary,
  uploadFilesToCloudinary
};
