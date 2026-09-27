import jwt from "jsonwebtoken";
const SECRET = process.env.JWT_SECRET || "devsecret";

export function setupSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      socket.user = jwt.verify(token, SECRET);
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected: " + socket.user.email);
    socket.join("user:" + socket.user.id);

    socket.on("project:join", (id) => socket.join("project:" + id));
    socket.on("project:leave", (id) => socket.leave("project:" + id));
    socket.on("disconnect", () => console.log("User disconnected: " + socket.user.email));
  });
}
