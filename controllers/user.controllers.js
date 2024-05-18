import { User } from "../model/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import bcrypt from "bcrypt";
import { cookieOptions, emitEvent, sendToken, uploadFilesToCloudinary } from "../utils/features.js";
import { ErrorHandler } from "../utils/errorHandler.js";
import { Chat } from "../model/chat.model.js";
import { Request } from "../model/request.model.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.contants.js";
import { getOtherMember } from "../lib/helper.js";

const newUser = asyncHandler(async (req, res, next) => {
   
  const { name, username, password, bio } = req.body;

  const file = req.file;

  if(!file)
    return next(new ErrorHandler("Please Upload Avatar"))

   const result = await uploadFilesToCloudinary([file]); 

  const avatar = {
    public_id: result[0].public_id,
    url: result[0].url,
  };

  const isUser = await User.findOne({ username });
  if (isUser) return next(new ErrorHandler("User Already Exist", 404));

  const user = await User.create({
    name,
    username,
    password,
    bio,
    avatar,
  });

  if (!user) return next(new ErrorHandler("User not Created", 500));

  return sendToken(res, user, 200, `Welcome ${name} 😘`);
});

const login = asyncHandler(async (req, res, next) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username }).select("+password");


  if (!user) return next(new ErrorHandler("Invalid Username Or Password", 404));

  const isPassMatch = await bcrypt.compare(password, user.password);

  if (!isPassMatch) return next(new ErrorHandler("Invalid Password", 404));

  return sendToken(res, user, 200, `Welcome back ${user.name} 😍`);
});

const getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user);

  return res.status(200).json({
    success: true,
    user,
  });
});

const logout = asyncHandler(async(req, res) => {
    const userId = req.user;

    const userName = await User.findById(userId).select("name");
    
  return res
    .status(200)
    .cookie("chattuToken", "", { ...cookieOptions, maxAge: 0 })
    .json({
      success: true,
      message: `Miss You ${userName.name} 😢`,
    });
});

const searchUser = asyncHandler(async (req, res) => {
  const { name = "" } = req.query;

  const myChats = await Chat.find({ groupChat: false, members: req.user });

  const allUsersFromMyChats = myChats.flatMap((chat) => chat.members);

  const allUsersExceptMeAndMyFriends = await User.find({
    _id: { $nin: allUsersFromMyChats },
    name: { $regex: name, $options: "i" },
  });

  const users = allUsersExceptMeAndMyFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));

  return res.status(200).json({
    success: true,
    users,
  });
});

const sendFriendRequest = asyncHandler(async (req, res, next) => {
  const { userId } = req.body;

  const request = await Request.findOne({
    $or: [
      { sender: req.user, receiver: userId },
      { sender: userId, receiver: req.user },
    ],
  });



  if (request) return next(new ErrorHandler("Request already sent", 400));

  await Request.create({
    sender: req.user,
    receiver: userId,
  });

  emitEvent(req, NEW_REQUEST, [userId]);

  return res.status(200).json({
    success: true,
    message: "Friend Request Send",
  });
});

const acceptFriendRequest = asyncHandler(async (req, res, next) => {
  const { requestId, accept } = req.body;

  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

  if (!request) return next(new ErrorHandler("request not found", 404));

  if (request.receiver._id.toString() !== req.user.toString())
    return next(
      new ErrorHandler("You are not authorized to accept this request", 401)
    );

  if (!accept) {
    await request.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Friend Request Rejected",
    });
  }

  const members = [request.sender._id, request.receiver._id];
  
  await Promise.all(
      [Chat.create({
          name: `${request.sender.name}-${request.receiver.name}`,
          members: members,
        }),
    request.deleteOne()]
);

    emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "Friend Request Accepted",
    senderId: request.sender._id
  });
});

const getNotifications = asyncHandler(async (req, res, next) => {
    const userId = req.user;

    const requests = await Request.find({
        receiver: userId
    }).populate("sender", "name avatar")

    const allRequests = requests.map(({_id, sender}) => ({
        _id,
        sender: {
            _id: sender._id,
            name: sender.name,
            avatar: sender.avatar.url
        }
    }));

    

    res.status(200).json({
        success: true,
        allRequests,
    })
})

const getMyFriends = asyncHandler(async (req, res, next) => {
    
    const chatId = req.query.chatId;

    const chat = await Chat.find({
        groupChat: false,
        members: req.user
    }).populate("members", "name avatar")

    const friends = chat.map(({members}) => {
        const otherUser = getOtherMember(members, req.user);

        return {
            _id: otherUser._id,
            name: otherUser.name,
            avatar: otherUser.avatar.url
        }
    })

    if(chatId){
        const chat = await Chat.findById(chatId);
        const availableFriends = friends.filter((friend) => !chat.members.includes(friend._id))

        return res.status(200).json({
            success: true,
            friends: availableFriends
        })
    }
    else{
        res.status(200).json({
            success: true,
            friends
        })
    }

})



export {
  login,
  newUser,
  getMyProfile,
  logout,
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  getNotifications,
  getMyFriends,
};
