const asyncHandler = (passedFunc) => async(req, res, next) => {
    try {
        await passedFunc(req, res,next)
    } catch (error) {
        next(error)
    }
}

export default asyncHandler