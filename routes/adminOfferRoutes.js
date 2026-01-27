import express from 'express';
const router = express.Router();
import * as offerController from '../controller/offerController.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';

router.get('/', adminAuthMiddleware, offerController.getOfferList);
router.get('/add', adminAuthMiddleware, offerController.getAddOffer);
router.post('/add', adminAuthMiddleware, offerController.postAddOffer);
router.patch('/:offerId/toggle', adminAuthMiddleware, offerController.toggleOfferStatus);
router.get('/edit/:offerId', adminAuthMiddleware, offerController.getEditOffer);
router.post('/edit/:offerId', adminAuthMiddleware, offerController.postEditOffer);

export default router;
