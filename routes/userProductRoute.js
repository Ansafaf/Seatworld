import { getProductdetail, getProducts } from '../controller/productController.js';
import { authMiddleware } from "../middleware/authMiddleware.js";
import express from 'express';
const router = express.Router();
router.get('/products', getProducts);
router.get('/product/:id', getProductdetail);


export default router;