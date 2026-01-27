import { getProductdetail, getProducts } from '../controller/productController.js';
import express from 'express';
const router = express.Router();
router.get('/products', getProducts);
router.get('/product/:productId', getProductdetail);


export default router;