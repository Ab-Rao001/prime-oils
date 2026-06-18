import multer from 'multer';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    const err = new Error('Only JPEG and PNG images are allowed');
    err.statusCode = 400;
    cb(err);
  },
});

export function handleProductImageUpload(req, res, next) {
  upload.single('image')(req, res, err => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Image must be 5MB or smaller',
        });
      }
      if (err.statusCode === 400) {
        return res.status(400).json({ success: false, message: err.message });
      }
      return next(err);
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required',
      });
    }

    next();
  });
}

export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES };
