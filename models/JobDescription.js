import mongoose from 'mongoose';
export default mongoose.model('JobDescription', new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, title: { type: String, trim: true, maxlength: 150 }, company: { type: String, trim: true, maxlength: 100 }, content: { type: String, required: true, maxlength: 20000 } }, { timestamps: true }));
