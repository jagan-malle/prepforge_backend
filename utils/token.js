import jwt from 'jsonwebtoken'; export const issueToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
