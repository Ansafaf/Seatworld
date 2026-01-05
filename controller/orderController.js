// import Order from "../models/orderModel";
import {getSelectedPaymentMethod} from "../public/js/users/paymentOptions.js";
import logger from "../utils/logger.js";
export const getorders = async(req, res)=>{
   const userId = req.session.user.id;
   const orderlist = await Order.find({userId});
   res.json({type: "success", orderlist});
}

export const getOrderSuccess = async(req,res)=>{
    try{
        const userId = req.session.user.id;

       const paymentMethod = getSelectedPaymentMethod();
        if(paymentMethod == "COD"){
         order.paymentStatus = "Pending";
         order.orderStatus = "Placed";
        }
        logger.info(`${req.session.order}`);
    }
    catch(err){
      logger.error("page cant be displayed Error:", error);
    }
}

export const cancelOrders = async(req,res)=> {
    
}

export const invoiceOrder = async(req,res)=>{
    
}