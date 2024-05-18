import { Router } from "express";
import {
    addMembers,
    deleteChat,
    getChatDetails,
    getMessages,
    getMyChats,
    getMyGroups,
    leaveGroup,
    newGroupChat,
    removeMember,
    renameGroup,
    sendAttachments,
} from "../controllers/chat.controllers.js";
import {
    addMemberValidator,
    chatIdValidator,
    removeMemberValidator,
    sendAttachmentsValidator,
    validateHandler
} from "../lib/validators.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { attachmentsMulter } from "../middlewares/multer.js";

const router = Router();

router.use(isAuthenticated);

router.post("/new",  newGroupChat);

router.get("/my", getMyChats); // jo side m saare chats hote h chats + groups

router.get("/my/groups", getMyGroups);

router.put("/addmembers", addMemberValidator(), validateHandler, addMembers);

router.put(
  "/removemember",
  removeMemberValidator(),
  validateHandler,
  removeMember
);

router.delete("/leave/:id", chatIdValidator(), validateHandler, leaveGroup);

router.post(
  "/message",
  attachmentsMulter,
  sendAttachmentsValidator(),
  validateHandler,
  sendAttachments
);

router.get("/message/:id", chatIdValidator(), validateHandler, getMessages);

router
  .route("/:id")
  .get(chatIdValidator(), validateHandler, getChatDetails)
  .put(chatIdValidator(), validateHandler, renameGroup)
  .delete(chatIdValidator(), validateHandler, deleteChat);

export default router;
