import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ProductVariant, Product } from './models/productModel.js';
import { Category } from './models/categoryModel.js';


dotenv.config();

async function checkColors() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const [colors, brands, categories] = await Promise.all([
            ProductVariant.distinct('color', { status: 'Active' }),
            Product.distinct('brand'),
            Category.find({ isActive: true }).select('categoryName').lean()
        ]);
        console.log('Distinct colors:', JSON.stringify(colors, null, 2));
        console.log('Distinct brands:', JSON.stringify(brands, null, 2));
        console.log('Categories:', JSON.stringify(categories.map(c => c.categoryName), null, 2));


        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkColors();
