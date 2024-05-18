import { envMode } from "../app.js";

const errorMiddleware = (err, req, res, next) => {
  err.message ||= "Invalid Server Error";
  err.statusCode ||= 500;
    

  if (err.code === 11000) {
    const error = Object.keys(err.keyPattern).join(",");
    err.message = `Duplicate Fields - ${error}`;
    err.statusCode = 400;
  }

  if (err.name === "CastError") {
    const errorPath = err.path;
    err.message = `Invalid format of ${errorPath}`;
    err.statusCode = 400;
  }

  const response = {
    success: false,
    message: err.message,
  }

  if(envMode == "DEVELOPMENT"){
    response.error = err
  }

  return res.status(err.statusCode).json(response);
};

export { errorMiddleware };
