import { body, param, validationResult } from "express-validator";
import { ErrorHandler } from "../utils/errorHandler.js";

const validateHandler = (req, res, next) => {
  let errors = validationResult(req);

  const errorMsg = errors
    .array()
    .map((error) => error.msg)
    .join(", ");

  if (errors.isEmpty()) return next();
  else next(new ErrorHandler(errorMsg, 400));
};

const registerValidator = () => [
  body("name", "Please enter name").notEmpty(),
  body("username", "Please enter username").notEmpty(),
  body("bio", "Please enter bio").notEmpty(),
  body("password", "Please enter password").notEmpty(),
];

const loginValidator = () => [
  body("username", "Please enter username").notEmpty(),
  body("password", "Please enter password").notEmpty(),
];

const newGroupValidator = () => [
  body("name", "Please enter name").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please provide members")
    .isArray({ min: 2, max: 100 })
    .withMessage("members must be from 2-100"),
];

const addMemberValidator = () => [
  body("chatId", "Please enter ChatId").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please provide members")
    .isArray()
    .withMessage("members must be provided"),
];

const removeMemberValidator = () => [
  body("chatId", "Please enter Chat Id").notEmpty(),
  body("userId", "Please enter user Id").notEmpty(),
];

const sendAttachmentsValidator = () => [
  body("chatId", "please provide Chat Id").notEmpty(),
];

const renameGroupValidator = () => [
  body("name", "Please provide name").notEmpty(),
  param("id", "Please provide Chat Id").notEmpty(),
];

const chatIdValidator = () => [
  param("id", "Please Provide Chat Id").notEmpty(),
];

const sendFriendRequestValidator = () => [
  body("userId", "Please provide User Id").notEmpty(),
];

const acceptFriendRequestValidator = () => [
  body("requestId", "Please provide Request Id").notEmpty(),
  body("accept")
    .notEmpty()
    .withMessage("Please add accept or not")
    .isBoolean()
    .withMessage("Accept Must Be boolean"),
];

const adminLoginValidator = () => [
    body("secretKey", "Please Provide Secret Key").notEmpty()
]

export {
    acceptFriendRequestValidator, addMemberValidator, adminLoginValidator, chatIdValidator, loginValidator,
    newGroupValidator, registerValidator, removeMemberValidator, renameGroupValidator, sendAttachmentsValidator, sendFriendRequestValidator, validateHandler
};

