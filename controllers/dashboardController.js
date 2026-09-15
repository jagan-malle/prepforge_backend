import asyncHandler from 'express-async-handler';
import Analysis from '../models/Analysis.js';
import InterviewSession from '../models/InterviewSession.js';

export const overview = asyncHandler(async (req, res) => {
  const user = req.user._id;
  const [analyses, interviews] = await Promise.all([
    Analysis.find({ user }).sort('-createdAt').limit(20).lean(),
    InterviewSession.find({ userId: user, status: 'completed' }).sort('-completedAt').limit(20).lean()
  ]);
  const latest = analyses[0];
  const averageInterviewScore = interviews.length ? Math.round(interviews.reduce((sum, item) => sum + (item.overallScore || 0), 0) / interviews.length * 10) / 10 : null;
  const weaknesses = [...new Set(analyses.flatMap(a => a.missingSkills || []))].slice(0, 6);
  const improvements = [...new Set(analyses.flatMap(a => a.recommendations || []))].slice(0, 4);
  res.json({
    metrics: { atsScore: latest?.score ?? null, jobMatchScore: latest?.score ?? null, interviewCount: interviews.length, averageInterviewScore },
    recentAnalyses: analyses.slice(0, 5),
    recentInterviews: interviews.slice(0, 5),
    skillWeaknesses: weaknesses,
    recommendations: improvements,
    charts: {
      atsHistory: analyses.slice(0, 10).reverse().map(a => ({ date: a.createdAt.toISOString().slice(0, 10), score: a.score })),
      interviewHistory: interviews.slice(0, 10).reverse().map(i => ({ date: i.completedAt?.toISOString().slice(0, 10), score: i.overallScore })),
      performance: interviews.length ? ['technicalScore','communicationScore','relevanceScore','completenessScore'].map(key => ({
        metric: key.replace('Score','').replace(/^./, c => c.toUpperCase()),
        score: Math.round(interviews.reduce((sum, i) => sum + (i.finalReport?.[key] || 0), 0) / interviews.length * 10) / 10
      })) : []
    }
  });
});
