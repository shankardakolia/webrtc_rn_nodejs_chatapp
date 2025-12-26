const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room ${room}`);
    socket.to(room).emit('user-joined', socket.id);
  });

  socket.on('offer', (payload) => {
    console.log(`Offer from ${socket.id} to ${payload.target}`);
    socket.to(payload.target).emit('offer', {
      sdp: payload.sdp,
      sender: socket.id
    });
  });

  socket.on('answer', (payload) => {
    console.log(`Answer from ${socket.id} to ${payload.target}`);
    socket.to(payload.target).emit('answer', {
      sdp: payload.sdp,
      sender: socket.id
    });
  });

  socket.on('ice-candidate', (payload) => {
    console.log(`ICE Candidate from ${socket.id} to ${payload.target}`);
    socket.to(payload.target).emit('ice-candidate', {
      candidate: payload.candidate,
      sender: socket.id
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
