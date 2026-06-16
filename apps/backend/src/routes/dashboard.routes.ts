import { Router } from "express";
import {
  createDashboardNoteHandler,
  deleteDashboardNoteHandler,
  getDashboardHandler,
  listDashboardNotesHandler,
  updateDashboardNoteHandler
} from "../controllers/dashboard.controller.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", getDashboardHandler);
dashboardRouter.get("/notes", listDashboardNotesHandler);
dashboardRouter.post("/notes", createDashboardNoteHandler);
dashboardRouter.patch("/notes/:id", updateDashboardNoteHandler);
dashboardRouter.delete("/notes/:id", deleteDashboardNoteHandler);
