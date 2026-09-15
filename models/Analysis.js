import mongoose from 'mongoose';
const schema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true }, jobDescription: { type: mongoose.Schema.Types.ObjectId, ref: 'JobDescription' }, score: Number, breakdown: Object, matchedSkills: [String], missingSkills: [String], matchedKeywords: [String], missingKeywords: [String], recommendations: [String] }, { timestamps: true });
schema.index({ user: 1, createdAt: -1 });
export default mongoose.model('Analysis', schema);
