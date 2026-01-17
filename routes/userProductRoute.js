import { getProductdetail, getProducts } from '../controller/productController.js';
import { optionalAuth } from "../middleware/optionalAuth.js";
import express from 'express';
const router = express.Router();
router.get('/products', optionalAuth, getProducts);
router.get('/product/:id', optionalAuth, getProductdetail);


export default router;