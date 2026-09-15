import mongoose from 'mongoose';
const questionSchema = new mongoose.Schema({ question:String, topic:String, difficulty:String, retrievalSources:[String] }, { _id:false });
const answerSchema = new mongoose.Schema({ questionIndex:Number, transcript:String, evaluation:Object, retrievalSources:[String], submittedAt:{type:Date,default:Date.now} }, { _id:false });
export default mongoose.model('InterviewSession', new mongoose.Schema({
  userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}, resumeId:{type:mongoose.Schema.Types.ObjectId,ref:'Resume'}, jobDescriptionId:{type:mongoose.Schema.Types.ObjectId,ref:'JobDescription'}, targetRole:{type:String,required:true,trim:true}, interviewType:{type:String,enum:['Technical','HR'],required:true}, difficulty:{type:String,enum:['Easy','Medium','Hard'],required:true}, questionCount:{type:Number,min:1,max:10,required:true}, questions:[questionSchema], answers:[answerSchema], scores:[Number], overallScore:Number, status:{type:String,enum:['active','completed'],default:'active'}, startedAt:{type:Date,default:Date.now}, completedAt:Date
  ,finalReport:{type:Object,default:null}
}, {timestamps:true}));
