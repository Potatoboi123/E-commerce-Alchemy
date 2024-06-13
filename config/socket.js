let io;
const users={};
const email={};
module.exports={
    init: httpServer=>{

        io=require("socket.io")(httpServer);

        io.on('connection', (socket) => {
            socket.on('disconnect', () => {
              delete users[socket.id]
              delete email[socket.id]
            });

            socket.on("new-user",(data)=>{
                users[socket.id]=data.name
                email[socket.id]=data.email
            })

            socket.on('chat-message', (msg) => {
                io.emit('chat-message', {msg,name:users[socket.id],email:email[socket.id]});
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

