import multer from 'multer'; import path from 'path';
const storage = multer.diskStorage({ destination: 'uploads/', filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname)}`) });
export const allowedResumeMimeTypes = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
export const isAllowedResumeFile = mimeType => allowedResumeMimeTypes.includes(mimeType);
export const uploadResume = multer({ storage, limits: { fileSize: (Number(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024 }, fileFilter: (req, file, cb) => isAllowedResumeFile(file.mimetype) ? cb(null, true) : cb(new Error('Only PDF, DOC, and DOCX resume files are allowed.')) }).single('resume');
