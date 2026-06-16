import { Router } from "express";
import {
  createClientContactHandler,
  createClientHandler,
  deleteClientHandler,
  getClientHandler,
  listClientContactsHandler,
  listClientsHandler,
  updateClientHandler
} from "../controllers/client.controller.js";

export const clientRouter = Router();

clientRouter.get("/", listClientsHandler);
clientRouter.get("/:id", getClientHandler);
clientRouter.get("/:id/contacts", listClientContactsHandler);
clientRouter.post("/", createClientHandler);
clientRouter.post("/:id/contacts", createClientContactHandler);
clientRouter.put("/:id", updateClientHandler);
clientRouter.delete("/:id", deleteClientHandler);
