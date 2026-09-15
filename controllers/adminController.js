import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Resume from '../models/Resume.js';
import InterviewSession from '../models/InterviewSession.js';
export const stats = asyncHandler(async (req, res) => {
  const [users, resumes, interviews, score] = await Promise.all([
    User.countDocuments(), Resume.countDocuments(), InterviewSession.countDocuments({ status: 'completed' }),
    InterviewSession.aggregate([{ $match: { status: 'completed', overallScore: { $ne: null } } }, { $group: { _id: null, average: { $avg: '$overallScore' } } }])
  ]);
  res.json({ users, resumes, interviews, averageInterviewScore: score[0] ? Math.round(score[0].average * 10) / 10 : null });
});
