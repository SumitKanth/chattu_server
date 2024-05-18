import { Router } from "express";
import {
  login,
  newUser,
  getMyProfile,
  logout,
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  getNotifications,
  getMyFriends,
} from "../controllers/user.controllers.js";
import { singleAvatar } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import {
    acceptFriendRequestValidator,
  loginValidator,
  registerValidator,
  sendFriendRequestValidator,
  validateHandler,
} from "../lib/validators.js";

const router = Router();

router.post(
  "/new",
  singleAvatar,
  registerValidator(),
  validateHandler,
  newUser
);

router.post("/login", loginValidator(), validateHandler, login);

// After here user must be logged in to access routes

router.use(isAuthenticated);

router.get("/me", getMyProfile);

router.get("/logout", logout);

router.get("/search", searchUser);

router.put("/send-request", sendFriendRequestValidator(), validateHandler, sendFriendRequest);

router.put("/accept-request", acceptFriendRequestValidator(), validateHandler, acceptFriendRequest)

router.get("/notifications", getNotifications)

router.get("/friends", getMyFriends)

export default router;
