import Order from "../models/orderModel";
import {} from "../services/checkoutService.js";
export const getorders = async(req, res)=>{
   const userId = req.session.user.id;
   const orderlist = await Order.find({userId});
   res.json({type: "success", orderlist});
}

export const getOrderSuccess = async(req,res)=>{
    try{
        const userId = req.session.user.id;
        
    }
    catch(err){

    }
}

export const cancelOrders = async(req,res)=> {
    
}

export const invoiceOrder = async(req,res)=>{
    
}