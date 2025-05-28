import express from "express";

export const baseRouter = express.Router();

baseRouter.get("/", (req, res) => {
  res.json({
    message: "Welcome to the base route!",
    timestamp: new Date().toISOString(),
  });
});

baseRouter.get("/get", (req, res) => {
  res.json({
    message: "GET request to the base route",
    timestamp: new Date().toISOString(),
  });
});
