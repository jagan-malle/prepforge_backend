import asyncHandler from "express-async-handler";
import Resume from "../models/Resume.js";
import JobDescription from "../models/JobDescription.js";
import Analysis from "../models/Analysis.js";
import { analyzeCompatibility } from "../services/atsAnalysisService.js";
export const jobMatch = asyncHandler(async (req, res) => {
  const { resumeId, jobDescription, jobDescriptionId } = req.body;
  if (!resumeId || (!jobDescription && !jobDescriptionId)) {
    res.status(400);
    throw new Error("resumeId and a job description are required.");
  }
  const resume = await Resume.findOne({ _id: resumeId, user: req.user._id });
  if (!resume) {
    res.status(404);
    throw new Error("Resume not found.");
  }
  if (resume.status !== "ready") {
    res.status(422);
    throw new Error("This resume is not ready for analysis.");
  }
  const job = jobDescriptionId
    ? await JobDescription.findOne({
        _id: jobDescriptionId,
        user: req.user._id,
      })
    : null;
  const content = job?.content || jobDescription;
  const result = analyzeCompatibility(resume.extractedText, content);
  const saved = await Analysis.create({
    user: req.user._id,
    resume: resume._id,
    jobDescription: job?._id,
    ...result,
  });
  res
    .status(201)
    .json({ ...result, id: saved._id, createdAt: saved.createdAt });
});
export const recent = asyncHandler(async (req, res) =>
  res.json(
    await Analysis.find({ user: req.user._id })
      .populate("resume", "originalName")
      .sort("-createdAt")
      .limit(8),
  ),
);
