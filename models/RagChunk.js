import mongoose from 'mongoose';
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},sourceType:{type:String,enum:['resume','job'],required:true},sourceId:{type:mongoose.Schema.Types.ObjectId,required:true},chunkIndex:{type:Number,required:true},text:{type:String,required:true},embedding:{type:[Number],required:true},metadata:{type:Object,default:{}}},{timestamps:true});
schema.index({user:1,sourceType:1,sourceId:1,chunkIndex:1},{unique:true}); export default mongoose.model('RagChunk',schema);
