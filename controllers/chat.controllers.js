import asyncHandler from "../utils/asyncHandler.js";
import { ErrorHandler } from "../utils/errorHandler.js";
import { Chat } from "../model/chat.model.js";
import {
  deletesFilesFromColudinary,
  emitEvent,
  uploadFilesToCloudinary,
} from "../utils/features.js";
import {
  ALERT,
  NEW_ATTACHMENT,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
} from "../constants/events.contants.js";
import { getOtherMember } from "../lib/helper.js";
import { User } from "../model/user.model.js";
import { Message } from "../model/message.model.js";

const newGroupChat = asyncHandler(async (req, res, next) => {
  const { name, members } = req.body;

  const allMembers = [...members, req.user];

  const groupChat = await Chat.create({
    name,
    groupChat: true,
    creator: req.user,
    members: allMembers,
  });

  emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "Group Created",
  });
});

// jo side m saare chats hote h chats + groups
const getMyChats = asyncHandler(async (req, res, next) => {
  // populate mtlb members ki id ki jgh name or avatar dena in this case
  const chats = await Chat.find({ members: req.user }).populate(
    "members",
    "name avatar"
  );

  const transformedChats = chats.map(({ _id, name, groupChat, members }) => {
    const otherMember = getOtherMember(members, req.user);

    return {
      _id: _id,
      name: groupChat ? name : otherMember.name,
      groupChat: groupChat,
      avatar: groupChat
        ? members.slice(0, 3).map(({ avatar }) => avatar.url)
        : [otherMember.avatar.url],
      members: members.reduce((prev, curr) => {
        if (curr._id.toString() !== req.user.toString()) {
          prev.push(curr._id);
        }
        return prev;
      }, []),
    };
  });

  res.status(200).json({
    success: true,
    chats: transformedChats,
  });
});

const getMyGroups = asyncHandler(async (req, res, next) => {
  const chats = await Chat.find({
    members: req.user,
    groupChat: true,
    creator: req.user,
  }).populate("members", "avatar name");

  const groups = chats.map(({ members, _id, name, groupChat }) => ({
    _id,
    groupChat,
    name,
    avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
  }));

  res.status(200).json({
    success: true,
    groups,
  });
});

const addMembers = asyncHandler(async (req, res, next) => {
  const { members, chatId } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat) {
    return next(new ErrorHandler("Chat Not Found", 404));
  }

  if (!chat.groupChat) {
    return next(new ErrorHandler("Not a group Chat", 400));
  }

  if (chat.creator.toString() !== req.user.toString()) {
    return next(new ErrorHandler("You are not allowed to add members", 403));
  }

  const allMembersPromise = members.map((i) => User.findById(i, "name"));

  const allNewMembers = await Promise.all(allMembersPromise);

  const uniqueMembers = allNewMembers
    .filter((i) => !chat.members.includes(i._id.toString()))
    .map((i) => i._id);

  chat.members.push(...uniqueMembers);

  if (chat.members.length > 100) {
    return next(new ErrorHandler("Group members limit reached", 400));
  }

  await chat.save();

  const allUsersName = allNewMembers.map((i) => i.name).join(", ");

  emitEvent(
    req,
    ALERT,
    chat.members,
    `${allUsersName} has been added in the group`
  );

  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    success: true,
    message: "Members added successfully",
  });
});

const removeMember = asyncHandler(async (req, res, next) => {
  const { userId, chatId } = req.body;

  const [chat, userThatWillWeRemoved] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId, "name"),
  ]);

  if (!chat) {
    return next(new ErrorHandler("Chat Not Found", 404));
  }

  if (!chat.groupChat) {
    return next(new ErrorHandler("This is not a group chat", 400));
  }

  if (chat.creator.toString() !== req.user) {
    return next(new ErrorHandler("You are not allowed to remove member", 400));
  }

  if (chat.creator.toString() === userId) {
    return next(new ErrorHandler("Group Admin cannot be removed"));
  }

  const allMembers = chat.members.map((i) => i.toString());

  if (chat.members.length <= 3) {
    return next(new ErrorHandler("Group must have atleast 3 members", 400));
  }

  chat.members = chat.members.filter(
    (member) => member.toString() !== userId.toString()
  );

  await chat.save();

  emitEvent(
    req,
    ALERT,
    chat.members,
    {message: `${userThatWillWeRemoved.name} has been removed`, chatId}
  );

  emitEvent(req, REFETCH_CHATS, allMembers);

  res.status(200).json({
    success: true,
    message: "User Removed Successfully",
  });
});

const leaveGroup = asyncHandler(async (req, res, next) => {
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.groupChat) {
    return next(new ErrorHandler("This is not a group chat", 400));
  }

  const leaveMember = chat.members.filter(
    (member) => member.toString() === req.user.toString()
  );

  const remainingMembers = chat.members.filter(
    (member) => member.toString() !== req.user.toString()
  );

  if (remainingMembers.length < 3) {
    return next(new ErrorHandler("Group must have atleast 3 members", 400));
  }

  if (chat.creator.toString() === req.user.toString()) {
    const randmonCreator = Math.floor(Math.random() * remainingMembers.length);
    chat.creator = remainingMembers[randmonCreator];
  }

  chat.members = remainingMembers;

  const [user] = await Promise.all([
    User.findById(req.user, "name"),
    chat.save(),
  ]);

  emitEvent(req, ALERT, chat.members, {message: `${user.name} has left the group`, chatId});
  emitEvent(req, REFETCH_CHATS, leaveMember);

  res.status(200).json({
    success: true,
    message: "Leave Group Successfully",
  });
});

const sendAttachments = asyncHandler(async (req, res, next) => {
  const { chatId } = req.body;

  const files = req.files || [];

  if (files.length < 1) {
    return next(new ErrorHandler("PLease Provide Attachments", 400));
  }

  if (files.length > 5) {
    return next(new ErrorHandler("Files Can't be more than 5", 400));
  }

  const [chat, me] = await Promise.all([
    Chat.findById(chatId),
    User.findById(req.user, "name"),
  ]);

  if (!chat) {
    return next(new ErrorHandler("Chat Not Found", 404));
  }

  //  Upload Files
  const attachments = [];

  const result = await uploadFilesToCloudinary([...files]);

  result.forEach((file) =>
    attachments.push({
      public_id: file.public_id,
      url: file.url,
    })
  );

  const messsgeForRealTime = {
    content: "",
    attachments,
    sender: {
      _id: me._id,
      name: me.name,
    },
    chat: chatId,
  };

  const messgeForDB = {
    content: "",
    attachments,
    sender: me._id,
    chat: chatId,
  };

  const message = await Message.create(messgeForDB);

  emitEvent(req, NEW_ATTACHMENT, chat.members, {
    message: messsgeForRealTime,
    chatId,
  });

  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

  res.status(200).json({
    success: true,
    message,
  });
});

const getChatDetails = asyncHandler(async (req, res, next) => {
  if (req.query.populate === "true") {
    const chat = await Chat.findById(req.params.id)
      .populate("members", "name avatar")
      .lean();

    if (!chat) return next(new ErrorHandler("Chat Not Found", 404));

    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));

    res.status(200).json({
      success: true,
      chat,
    });
  } else {
    const chat = await Chat.findById(req.params.id);

    if (!chat) return next(new ErrorHandler("Chat Not Found", 404));

    res.status(200).json({
      success: true,
      chat,
    });
  }
});

const renameGroup = asyncHandler(async (req, res, next) => {
  const chatId = req.params.id;
  const { name } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not Found", 404));

  if (!chat.groupChat) return next(new ErrorHandler("Not a group chat", 400));

  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("You are not allowed to change group", 403));

  chat.name = name;

  await chat.save();

  emitEvent(req, REFETCH_CHATS, chat.members);

  res.status(200).json({
    success: true,
    message: "Group Name Changed Successfully",
  });
});

const deleteChat = asyncHandler(async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  const members = chat.members;


  if (chat.groupChat && chat.creator.toString() !== req.user.toString())
    return next(
      new ErrorHandler("You are not allowed to delete the group", 403)
    );

  if (!chat.groupChat && !chat.members.includes(req.user.toString())) {
    return next(
      new ErrorHandler("You are not allowed to delete the chat", 403)
    );
  }

  const messageWithAttachments = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });

  const public_ids = [];

  messageWithAttachments.forEach(({ attachments }) => {
    attachments.forEach(({ public_id }) => public_ids.push(public_id));
  });

  await Promise.all([
    // deleteFiles From Cloudinary
    deletesFilesFromColudinary(public_ids),
    Chat.deleteOne(chat),
    Message.deleteMany({ chat: chatId }),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "Chat Deleted Successfully",
  });
});

const getMessages = asyncHandler(async (req, res, next) => {
  const chatId = req.params.id;
  const { page = 1 } = req.query;

  const resultPerPage = 20;

  const skip = (page - 1) * resultPerPage;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.members.includes(req.user.toString()))
    return next(
      new ErrorHandler("You are not allowed to access this chat", 400)
    );

  const [messages, totalMessagesCount] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(resultPerPage)
      .populate("sender", "name")
      .lean(),

    Message.countDocuments({ chat: chatId }),
  ]);

  const totalPages = Math.ceil(totalMessagesCount / resultPerPage);

  return res.status(200).json({
    success: true,
    messages: messages.reverse(),
    totalPages,
  });
});

export {
  newGroupChat,
  getMyChats,
  getMyGroups,
  addMembers,
  removeMember,
  leaveGroup,
  sendAttachments,
  getChatDetails,
  renameGroup,
  deleteChat,
  getMessages,
};
