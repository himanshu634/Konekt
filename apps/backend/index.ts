import express from "express";
import type { Request, Response } from "express";
import { createServer } from "http";
import { baseRouter } from "./base-routes";
import { initializeSocket } from "./socket";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware (basic setup)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// Basic routes
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Konekt Backend API is running!",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Socket status endpoint
app.get("/socket/status", (req: Request, res: Response) => {
  res.json({
    socketEnabled: true,
    message: "Socket.IO server is running",
    endpoint: `http://localhost:${PORT}`,
    timestamp: new Date().toISOString(),
  });
});

// Base routes configured
app.use("/base", baseRouter);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler - commented out to prevent path-to-regexp issues
// app.use((req: Request, res: Response) => {
//   res.status(404).json({
//     error: "Route not found",
//     path: req.originalUrl,
//   });
// });

// Start server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO server is ready for connections`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
export { io };
