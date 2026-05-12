import { Router } from "express";
import {
  createClientHandler,
  deleteClientHandler,
  getClientHandler,
  listClientsHandler,
  updateClientHandler
} from "../controllers/client.controller.js";

export const clientRouter = Router();

clientRouter.get("/", listClientsHandler);
clientRouter.get("/:id", getClientHandler);
clientRouter.post("/", createClientHandler);
clientRouter.put("/:id", updateClientHandler);
clientRouter.delete("/:id", deleteClientHandler);
