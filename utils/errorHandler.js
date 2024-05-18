class ErrorHandler extends Error{
    constructor(message="Server Error", statusCode=500){
        super(message);
        this.statusCode = statusCode
    }
}

export {ErrorHandler}