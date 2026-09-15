import asyncHandler from "express-async-handler";
import InterviewSession from "../models/InterviewSession.js";
import Resume from "../models/Resume.js";
import JobDescription from "../models/JobDescription.js";
import Analysis from "../models/Analysis.js";
import { createQuestion } from "../services/interviewQuestionService.js";
import {
  evaluateAnswer,
  generateFinalReport,
} from "../services/interviewEvaluationService.js";
import { indexDocument, retrieveContext } from "../services/rag/ragService.js";
const owned = async (id, userId) => {
  const s = await InterviewSession.findOne({ _id: id, userId });
  if (!s) {
    const e = new Error("Interview session not found.");
    e.statusCode = 404;
    throw e;
  }
  return s;
};
const context = async (s, query = "") => {
  const [resume, job, analysis] = await Promise.all([
    s.resumeId ? Resume.findOne({ _id: s.resumeId, user: s.userId }) : null,
    s.jobDescriptionId
      ? JobDescription.findOne({ _id: s.jobDescriptionId, user: s.userId })
      : null,
    Analysis.findOne({ user: s.userId, resume: s.resumeId || undefined }).sort(
      "-createdAt",
    ),
  ]);
  if (resume?.extractedText && resume.rag?.status !== "ready")
    try {
      await indexDocument({
        user: s.userId,
        sourceType: "resume",
        sourceId: resume._id,
        text: resume.extractedText,
        metadata: { name: resume.originalName },
      });
      resume.rag = { status: "ready", indexedAt: new Date() };
      await resume.save();
    } catch {}
  const retrieval = await retrieveContext({
    user: s.userId,
    query:
      query ||
      `${s.targetRole} ${(analysis?.missingSkills || []).join(" ")} ${s.interviewType}`,
  });
  return {
    missingSkills: analysis?.missingSkills || [],
    retrievedContext: retrieval.context,
    retrievalSources: retrieval.results.map(
      (r) => `${r.sourceType}:${r.sourceId}:${r.chunkIndex}`,
    ),
  };
};
export const start = asyncHandler(async (req, res) => {
  const {
    resumeId,
    jobDescriptionId,
    targetRole,
    interviewType,
    difficulty,
    questionCount,
  } = req.body;
  if (
    typeof targetRole !== "string" ||
    targetRole.trim().length < 2 ||
    targetRole.length > 100 ||
    !["Technical", "HR"].includes(interviewType) ||
    !["Easy", "Medium", "Hard"].includes(difficulty) ||
    !Number.isInteger(questionCount) ||
    questionCount < 1 ||
    questionCount > 10
  ) {
    res.status(400);
    throw new Error(
      "Provide a role, valid interview settings, and 1–10 questions.",
    );
  }
  if (
    resumeId &&
    !(await Resume.findOne({ _id: resumeId, user: req.user._id }))
  ) {
    res.status(404);
    throw new Error("Resume not found.");
  }
  if (
    jobDescriptionId &&
    !(await JobDescription.findOne({
      _id: jobDescriptionId,
      user: req.user._id,
    }))
  ) {
    res.status(404);
    throw new Error("Job description not found.");
  }
  const s = await InterviewSession.create({
    userId: req.user._id,
    resumeId: resumeId || undefined,
    jobDescriptionId: jobDescriptionId || undefined,
    targetRole: targetRole.trim(),
    interviewType,
    difficulty,
    questionCount,
  });
  const c = await context(s);
  const q = await createQuestion({ ...s.toObject(), ...c, previous: [] });
  s.questions = [{ ...q, retrievalSources: c.retrievalSources }];
  await s.save();
  res.status(201).json(s);
});
export const getSession = asyncHandler(async (req, res) =>
  res.json(await owned(req.params.id, req.user._id)),
);
export const question = asyncHandler(async (req, res) => {
  const s = await owned(req.body.sessionId, req.user._id);
  res.json({
    question: s.questions[s.answers.length],
    index: s.answers.length,
  });
});
export const evaluate = asyncHandler(async (req, res) => {
  const { sessionId, transcript } = req.body;
  const s = await owned(sessionId, req.user._id);
  if (s.status !== "active") {
    res.status(409);
    throw new Error("This interview is already complete.");
  }
  const i = s.answers.length,
    q = s.questions[i];
  if (
    !q ||
    typeof transcript !== "string" ||
    transcript.trim().length < 2 ||
    transcript.length > 12000
  ) {
    res.status(400);
    throw new Error("Provide an answer between 2 and 12,000 characters.");
  }
  const c = await context(s, `${q.question} ${transcript}`);
  const evaluation = await evaluateAnswer({
    question: q.question,
    transcript: transcript.trim(),
    interviewType: s.interviewType,
    difficulty: s.difficulty,
    retrievedContext: c.retrievedContext,
  });
  s.answers.push({
    questionIndex: i,
    transcript: transcript.trim(),
    evaluation,
    retrievalSources: c.retrievalSources,
  });
  s.scores.push(evaluation.score);
  await s.save();
  res.json({ evaluation, finished: s.answers.length >= s.questionCount });
});
export const next = asyncHandler(async (req, res) => {
  const s = await owned(req.body.sessionId, req.user._id);
  if (s.answers.length >= s.questionCount) {
    res.status(409);
    throw new Error("All questions have been answered.");
  }
  if (s.questions.length <= s.answers.length) {
    const last = s.answers.at(-1)?.transcript || "";
    const c = await context(s, `${s.targetRole} ${last}`);
    const q = await createQuestion({
      ...s.toObject(),
      ...c,
      previous: s.questions.map((q) => q.question),
      recentAnswers: s.answers.map((a) => a.transcript),
    });
    s.questions.push({ ...q, retrievalSources: c.retrievalSources });
    await s.save();
  }
  res.json({
    question: s.questions[s.answers.length],
    index: s.answers.length,
  });
});
export const complete = asyncHandler(async (req, res) => {
  const s = await owned(req.body.sessionId, req.user._id);
  if (s.answers.length < s.questionCount) {
    res.status(400);
    throw new Error("Answer all questions before completing the interview.");
  }
  if (s.status === "completed")
    return res.json({ session: s, report: s.finalReport });
  s.status = "completed";
  s.completedAt = new Date();
  s.overallScore =
    Math.round((s.scores.reduce((a, b) => a + b, 0) / s.scores.length) * 10) /
    10;
  const evaluations = s.answers.map((a) => a.evaluation);
  const average = (k) =>
    Math.round(
      (evaluations.reduce((n, x) => n + (x[k] || 0), 0) / evaluations.length) *
        10,
    ) / 10;
  const base = {
    overallScore: s.overallScore,
    technicalScore: average("technicalAccuracy"),
    communicationScore: average("clarity"),
    relevanceScore: average("relevance"),
    completenessScore: average("completeness"),
    confidenceScore: average("confidence"),
    averageAnswerScore: s.overallScore,
    strongTopics: [
      ...new Set(
        s.questions.filter((q, i) => s.scores[i] >= 7).map((q) => q.topic),
      ),
    ],
    weakTopics: [
      ...new Set(
        s.questions.filter((q, i) => s.scores[i] < 7).map((q) => q.topic),
      ),
    ],
    recommendedTopics: [
      ...new Set(evaluations.flatMap((e) => e.missingPoints || [])),
    ].slice(0, 5),
    improvementPlan:
      "Review the weak topics, rehearse answers using context → action → outcome, and complete another focused mock interview.",
  };
  try {
    s.finalReport = await generateFinalReport({
      answers: s.answers.map((a, i) => ({
        question: s.questions[i]?.question,
        ...a.toObject(),
      })),
      baseReport: base,
    });
  } catch (error) {
    console.warn(`Final AI report unavailable: ${error.message}`);
    s.finalReport = base;
  }
  await s.save();
  res.json({ session: s, report: s.finalReport });
});
