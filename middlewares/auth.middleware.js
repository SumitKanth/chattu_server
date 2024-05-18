import jwt from 'jsonwebtoken'
import asyncHandler from '../utils/asyncHandler.js'
import { ErrorHandler } from '../utils/errorHandler.js';
import { User } from '../model/user.model.js';

const isAuthenticated = (req, res, next) => {
    const token = req.cookies?.chattuToken;

    if(!token)
        return next(new ErrorHandler("Unauthorized Access", 401))

    const decodedData = jwt.verify(token, process.env.JWT_SECRET)    

    if(!decodedData) return next(new ErrorHandler("Unautherized Access", 401))

    req.user = decodedData._id;

    next()
}

const adminOnly = (req, res, next) => {
    const token = req.cookies["adminToken"];

    if(!token)
        return next(new ErrorHandler("Unauthorized Access", 401))

    const secketKey = jwt.verify(token, process.env.JWT_SECRET);

    if(!secketKey) return next(new ErrorHandler("Unauthorized Access", 401));

    const adminSecretKey = process.env.ADMIN_SECRET_KEY;

    const isMatched = secketKey === adminSecretKey;

    if(!isMatched)
        return next(new ErrorHandler("Only Admin can access thius route", 401));

    next()
}

const socketAuthenticator = async(err, socket, next) => {
    try {
        if(err) return next(err);

        const authToken = socket.request.cookies.chattuToken;

        if(!authToken){
            return next(new ErrorHandler("Please login to access this route", 401))
        }

        const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);

        const user = await User.findById(decodedData._id)

        if(!user)
            return next(new ErrorHandler("Please login to access this route", 401))

        socket.user = user;
        return next();

    } catch (error) {
        console.log(error);
        return next(new ErrorHandler("Please login to access this route", 401))
    }
}


export {
    isAuthenticated,
    adminOnly,
    socketAuthenticator,
}