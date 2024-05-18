import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../model/user.model.js";
import { Chat } from "../model/chat.model.js";
import { Message } from "../model/message.model.js";
import { ErrorHandler } from "../utils/errorHandler.js";
import jwt from "jsonwebtoken";
import { cookieOptions } from "../utils/features.js";

const adminLogin = asyncHandler(async (req, res, next) => {
  const { secretKey } = req.body;

  const adminSecretKey = process.env.ADMIN_SECRET_KEY;

  const isMatched = secretKey === adminSecretKey;

  if (!isMatched) return next(new ErrorHandler("Invalid Admin key", 401));

  const token = jwt.sign(secretKey, process.env.JWT_SECRET);

  return res
    .status(200)
    .cookie("adminToken", token, { ...cookieOptions, maxAge: 1000 * 60 * 15 })
    .json({
      success: true,
      message: "Authorized Successfully, Welcome BOSS",
    });
});

const getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find({});

  const transformedUsers = await Promise.all(
    users.map(async ({ name, username, _id, avatar }) => {
      const [friends, groups] = await Promise.all([
        Chat.countDocuments({ groupChat: false, members: _id }),
        Chat.countDocuments({ groupChat: true, members: _id }),
      ]);


      return {
        name,
        username,
        _id,
        avatar: avatar.url,
        friends,
        groups,
      };
    })
  );

  res.status(200).json({
    succes: true,
    users: transformedUsers,
  });
});

const allChats = asyncHandler(async (req, res, next) => {
  const chats = await Chat.find()
    .populate("members", "name avatar")
    .populate("creator", "name avatar");

  const transformedChats = await Promise.all(
    chats.map(async ({ members, _id, creator, name, groupChat }) => {
      const totalMessages = await Message.countDocuments({ chat: _id });

      return {
        _id,
        name,
        groupChat,
        avatar: members.slice(0, 3).map((member) => member.avatar.url),
        members: members.map(({ _id, name, avatar }) => ({
          _id,
          name,
          avatar: avatar.url,
        })),
        creator: {
          name: creator?.name || "None",
          avatar: creator?.avatar.url || "",
        },
        totalMembers: members.length,
        totalMessages,
      };
    })
  );

  res.status(200).json({
    success: true,
    chats: transformedChats,
  });
});

// Not Working while destructuring the message, else working
const allMessages = asyncHandler(async (req, res, next) => {
  const messages = await Message.find({})
    .populate("sender", "name avatar")
    .populate("chat", "groupChat");

  const transformedMessages = messages.map(
    ({ content, attachments, _id, sender, createdAt, chat }) => ({
        _id,
        attachments,
        content,
        createdAt,
        chat: chat?._id,
        groupChat: chat?.groupChat,
        sender: {
          _id: sender?._id,
          name: sender?.name,
          avatar: sender?.avatar.url,
        },
    })
  );

  return res.status(200).json({
    success: true,
    messages: transformedMessages,
  });
});

const getDashboardStats = asyncHandler(async (req, res, next) => {
  const [groupCount, usersCount, messageCount, totalChatsCount] =
    await Promise.all([
      Chat.countDocuments({ groupChat: true }),
      User.countDocuments(),
      Message.countDocuments(),
      Chat.countDocuments(),
    ]);

  const today = new Date();
  const last7days = new Date();

  last7days.setDate(last7days.getDate() - 7);

  const last7daysMessages = await Message.find({
    createdAt: {
      $gte: last7days,
      $lte: today,
    },
  }).select("createdAt");

  const messages = new Array(7).fill(0);

  const daysInMiliSeconds = 1000 * 60 * 60 * 24;

  last7daysMessages.forEach((message) => {
    const approxIndex =
      (today.getTime() - message.createdAt.getTime()) / daysInMiliSeconds;

    const index = Math.floor(approxIndex);
    messages[6 - index]++;
  });

  const stats = {
    groupCount,
    usersCount,
    messageCount,
    totalChatsCount,
    messagesChart: messages,
  };

  return res.status(200).json({
    success: true,
    stats,
  });
});

const adminLogout = asyncHandler(async (req, res, next) => {
  res
    .status(200)
    .cookie("adminToken", "", { ...cookieOptions, maxAge: 0 })
    .json({
      success: true,
      message: "Admin Logout Successfully, Bye BOSS",
    });
});

const getAdminData = asyncHandler(async(req, res, next) => {
    return res.status(200).json({
        admin: true
    })
})


export {
  getAllUsers,
  allChats,
  allMessages,
  getDashboardStats,
  adminLogin,
  adminLogout,
  getAdminData,
};
