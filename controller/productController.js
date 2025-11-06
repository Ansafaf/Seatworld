export async function getProductlist(req,res){
     try{
        const products = await product.find();
        res.render("productList",{products});
     }
     catch(err){
        console.log(err);
        res.send("Internal Server Error");
     }
}

export async function getProductdetail(req,res){
    try{
        const product = await product.findById(req.params.id);
        res.render("Productdetail",{product});
    }
    catch(err){
        console.log(err);
        res.send("Internal Server Error");
    }
}

export async function getProductbyBrand(res,req){
        try{
            const products = await product.find({brand: req.params.brand});
            res.render("ProductbyBrand",{products});
        }
        catch(err){
            console.log(err);
            res.send("Internal Server Error");
        }
}

export function getProductbyprice(res,req){
       
}

export function getProductbycategory(res,req){
               
}
export function getProductbyAll(res,req){

}