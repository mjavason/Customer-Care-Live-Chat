import { Server as SocketIOServer } from 'socket.io';

//#region Types and Interfaces
interface User {
  id: string;
  name: string;
  room: string;
}

interface Message {
  id: string;
  user: string;
  text: string;
  reactions: { user: string; reaction: string }[];
}

interface Reaction {
  messageId: string;
  reaction: string;
}

const users: User[] = [];
const messages: { [room: string]: Message[] } = {};

//#region User Management Functions
const addUser = ({ id, name, room }: User): { user?: User; error?: string } => {
  name = name.trim();
  room = room.trim();

  if (users.find((user) => user.room === room && user.name === name)) {
    return { error: `Username "${name}" is already taken in room "${room}".` };
  }

  const newUser = { id, name, room };
  users.push(newUser);

  console.log(`User added: ${JSON.stringify(newUser)}`);
  return { user: newUser };
};

const removeUser = (id: string): User | undefined => {
  const index = users.findIndex((user) => user.id === id);
  if (index !== -1) {
    const [removedUser] = users.splice(index, 1);
    console.log(`User removed: ${JSON.stringify(removedUser)}`);
    return removedUser;
  }
  console.log(`User with id "${id}" not found.`);
};

const getUser = (id: string): User | undefined => {
  const user = users.find((user) => user.id === id);
  console.log(
    `Fetching user with id "${id}": ${
      user ? JSON.stringify(user) : 'not found'
    }`
  );
  return user;
};

const getUsersInRoom = (room: string): User[] => {
  room = room.trim();
  const usersInRoom = users.filter((user) => user.room === room);
  console.log(
    `Fetching users in room "${room}": ${JSON.stringify(usersInRoom)}`
  );
  return usersInRoom;
};
//#endregion User Management Functions

//#region Socket Setup
export function socketSetup(server: any): void {
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', ({ name, room }, callback) => {
      const { user, error } = addUser({ id: socket.id, name, room });
      if (error) return callback?.(error);

      if (user) {
        socket.join(user.room);

        socket.emit('message', {
          user: 'admin',
          text: `${user.name}, welcome to room ${user.room}.`,
        });

        socket.broadcast.to(user.room).emit('message', {
          user: 'admin',
          text: `${user.name} has joined the room.`,
        });

        io.to(user.room).emit('roomData', {
          users: getUsersInRoom(user.room),
        });
      }

      callback?.();
    });

    socket.on('sendMessage', (text: string, callback) => {
      const user = getUser(socket.id);
      if (user) {
        const message: Message = {
          id: `${Date.now()}`,
          user: user.name,
          text,
          reactions: [],
        };

        messages[user.room] = messages[user.room] || [];
        messages[user.room].push(message);

        io.to(user.room).emit('message', message);

        console.log(
          `Message sent to room ${user.room} by ${user.name}: ${text}`
        );
        callback?.();
      }
    });

    socket.on('sendReaction', ({ messageId, reaction }: Reaction, callback) => {
      const user = getUser(socket.id);
      if (user) {
        const roomMessages = messages[user.room] || [];
        const message = roomMessages.find((msg) => msg.id === messageId);

        if (message) {
          message.reactions.push({ user: user.name, reaction });

          io.to(user.room).emit('reaction', {
            messageId,
            user: user.name,
            reaction,
          });

          console.log(
            `Reaction "${reaction}" added to message "${messageId}" by ${user.name}`
          );
        }
      }

      callback?.();
    });

    socket.on('disconnect', () => {
      const user = removeUser(socket.id);
      if (user) {
        io.to(user.room).emit('message', {
          user: 'admin',
          text: `${user.name} has left the room.`,
        });

        io.to(user.room).emit('roomData', {
          users: getUsersInRoom(user.room),
        });
      }

      console.log(`User disconnected: ${socket.id}`);
    });
  });
}
//#endregion Socket Setup
