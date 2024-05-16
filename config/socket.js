let io;
const users={};

module.exports={
    init: httpServer=>{

        io=require("socket.io")(httpServer);

        io.on('connection', (socket) => {
            console.log('a user connected');
            socket.on('disconnect', () => {
              console.log('user disconnected');
              delete users[socket.id]
            });

            socket.on("new-user",(name)=>{
                users[socket.id]=name
            })

            socket.on('chat-message', (msg) => {
                io.emit('chat-message', {msg,name:users[socket.id]});
              });
          });
          
        return io
    },
    getIO:()=>{
        if(!io){
            console.log("adad")
        }
        return io;
    }
}

