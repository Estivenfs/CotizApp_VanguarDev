import { Router } from "express";
import {
  createProductHandler,
  deleteProductHandler,
  getProductHandler,
  listProductsHandler,
  updateProductHandler
} from "../controllers/product.controller.js";

export const productRouter = Router();

productRouter.get("/", listProductsHandler);
productRouter.get("/:id", getProductHandler);
productRouter.post("/", createProductHandler);
productRouter.put("/:id", updateProductHandler);
productRouter.delete("/:id", deleteProductHandler);
