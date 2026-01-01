import { getProductdetail, getProducts } from '../controller/productController.js';
import { authMiddleware } from "../middleware/authMiddleware.js";
import express from 'express';
const router = express.Router();
router.get('/products', authMiddleware, getProducts);
router.get('/product/:id', authMiddleware, getProductdetail);

// router.get("/wishlist",getWishlist);

export default router;