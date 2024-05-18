const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5143', `${process.env.CLIENT_URL}`],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
}

export {
    corsOptions
}