import { OtInstruction, File } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { assertOtAccess } from '../utils/otAccess.js';
import { uploadOtFile } from '../services/otFileService.js';
import storageProvider from '../config/storage.js';

export const getOtInstructions = async (req, res, next) => {
  try {
    await assertOtAccess(req.user);

    const instructions = await OtInstruction.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: instructions
    });
  } catch (error) {
    console.error('Error fetching OT instructions:', error);
    next(error);
  }
};

export const createOtInstruction = async (req, res, next) => {
  try {
    await assertOtAccess(req.user, { requireAdmin: true });

    const { text = null } = req.body;

    if (!text && !req.file) {
      throw new AppError('Нужно указать текст или файл', 400);
    }

    let fileRecord = null;
    if (req.file) {
      fileRecord = await uploadOtFile({
        file: req.file,
        folderParts: ['instructions'],
        uploadedBy: req.user.id,
        entityType: 'other'
      });
    }

    const instruction = await OtInstruction.create({
      text,
      fileId: fileRecord?.id || null
    });

    res.status(201).json({
      success: true,
      message: 'Инструкция добавлена',
      data: instruction
    });
  } catch (error) {
    console.error('Error creating OT instruction:', error);
    next(error);
  }
};

export const downloadOtInstructionFile = async (req, res, next) => {
  try {
    await assertOtAccess(req.user);

    const { id } = req.params;

    const instruction = await OtInstruction.findByPk(id);
    if (!instruction) {
      throw new AppError('Инструкция не найдена', 404);
    }

    if (!instruction.fileId) {
      throw new AppError('Файл не найден', 404);
    }

    const file = await File.findByPk(instruction.fileId);
    if (!file || file.isDeleted) {
      throw new AppError('Файл не найден', 404);
    }

    const downloadData = await storageProvider.getDownloadUrl(file.filePath, {
      expiresIn: 3600,
      fileName: file.originalName || file.fileName
    });

    res.json({
      success: true,
      data: {
        url: downloadData.url,
        fileName: file.originalName || file.fileName
      }
    });
  } catch (error) {
    console.error('Error downloading OT instruction file:', error);
    next(error);
  }
};
