import { faker, simpleFaker } from '@faker-js/faker';
import { Chat } from "../model/chat.model.js";
import { Message } from '../model/message.model.js';
import { User } from "../model/user.model.js";

const createSingleChats = async (numChats) => {
    try {
        const users = await User.find().select("_id");

        const chatPromise = [];

        for(let i=0; i<users.length; i++){
            for(let j=i+1; j<users.length; j++){
                chatPromise.push(
                    Chat.create({
                        name: faker.lorem.words(2),
                        members: [users[i], users[j]],
                    })
                )
            }
            await Promise.all(chatPromise);

            console.log("Chats Created Successfully");
            process.exit();
        }
    } catch (error) {
        console.log(error)
        process.exit(1);
    }
}

const createGroupChats = async(numChats) => {
    try {
        const users = await User.find().select("_id");

        const chatPromise = [];

        for(let i=0; i<numChats; i++){
            const numMembers = simpleFaker.number.int({min: 3, max: users.length});

            const members = [];

            for(let j=0; j<numMembers; j++){
                const randomIndex = Math.floor(Math.random() * users.length);
                const randomUser = users[randomIndex];

                if(!members.includes(randomUser)){
                    members.push(randomUser);
                }
            }

            const chat = Chat.create({
                groupChat: true,
                name: faker.lorem.word(2),
                members,
                creator: members[0],
            })
            chatPromise.push(chat); 
        }

        await Promise.all(chatPromise);
        console.log("Group Created Successfully")
        process.exit();
    } catch (error) {
        console.log(error);
        process.exit(1)
    }
}

const createMessages = async(numMessages) => {
    try {
        const users = await User.find().select("_id")
        const chats = await Chat.find().select("_id")

        console.log("Total Users: ", users);

        const messagePromise = [];
        
        for(let i=0; i<numMessages; i++){
            let randomUser = Math.floor(Math.random() * users.length);
            randomUser = users[randomUser];
            const randomChat = chats[Math.random() * chats.length];
            messagePromise.push(
                Message.create({
                    sender: randomUser,
                    chat: randomChat,
                    content: faker.lorem.sentence(),
                })
            )
        }
        
        await Promise.all(messagePromise)
        console.log("Message Created Successfully")
        process.exit();
    } catch (error) {
        console.log(error)
        process.exit(1);
    }
}

const createMessageForParticularChat = async(chatId, numMessages) => {
    try {
        const users = await User.find().select("_id");
        const messagePromise = [];
        
        for(let i=0; i<numMessages; i++){
            let randomUser = Math.floor(Math.random() * users.length);
            randomUser = users[randomUser];
            
            messagePromise.push(
                Message.create({
                    chat: chatId,
                    sender: randomUser,
                    content: faker.lorem.sentence(),
                })
            )
        }

        await Promise.all(messagePromise);

        console.log("Message created successfully");
        process.exit();
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}


export {
    createGroupChats, createMessageForParticularChat, createMessages, createSingleChats
};
