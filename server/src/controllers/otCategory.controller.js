import { OtCategory, OtDocument } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { assertOtAccess } from '../utils/otAccess.js';

const buildCategoryTree = (categories, documents) => {
  const categoryMap = new Map();

  categories.forEach((category) => {
    categoryMap.set(category.id, {
      id: category.id,
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      sortOrder: category.sortOrder,
      children: [],
      documents: []
    });
  });

  documents.forEach((doc) => {
    const node = categoryMap.get(doc.categoryId);
    if (node) {
      node.documents.push({
        id: doc.id,
        name: doc.name,
        description: doc.description,
        isRequired: doc.isRequired,
        templateFileId: doc.templateFileId,
        categoryId: doc.categoryId
      });
    }
  });

  const roots = [];
  categoryMap.forEach((node) => {
    if (node.parentId && categoryMap.has(node.parentId)) {
      categoryMap.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortTree = (nodes) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((node) => sortTree(node.children));
  };

  sortTree(roots);
  return roots;
};

export const getOtCategories = async (req, res, next) => {
  try {
    await assertOtAccess(req.user);

    const includeDeleted = req.query.includeDeleted === '1';

    const [categories, documents] = await Promise.all([
      OtCategory.findAll({
        where: includeDeleted ? {} : { isDeleted: false },
        order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']]
      }),
      OtDocument.findAll({
        where: includeDeleted ? {} : { isDeleted: false },
        order: [['createdAt', 'ASC']]
      })
    ]);

    const tree = buildCategoryTree(categories, documents);

    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('Error fetching OT categories:', error);
    next(error);
  }
};

export const createOtCategory = async (req, res, next) => {
  try {
    await assertOtAccess(req.user, { requireAdmin: true });

    const { name, description = null, parentId = null, sortOrder = 0 } = req.body;

    if (!name) {
      throw new AppError('Название категории обязательно', 400);
    }

    const category = await OtCategory.create({
      name,
      description,
      parentId,
      sortOrder
    });

    res.status(201).json({
      success: true,
      message: 'Категория создана',
      data: category
    });
  } catch (error) {
    console.error('Error creating OT category:', error);
    next(error);
  }
};

export const updateOtCategory = async (req, res, next) => {
  try {
    await assertOtAccess(req.user, { requireAdmin: true });

    const { id } = req.params;
    const { name, description, parentId, sortOrder } = req.body;

    const category = await OtCategory.findByPk(id);

    if (!category || category.isDeleted) {
      throw new AppError('Категория не найдена', 404);
    }

    await category.update({
      name: name ?? category.name,
      description: description ?? category.description,
      parentId: parentId ?? category.parentId,
      sortOrder: sortOrder ?? category.sortOrder
    });

    res.json({
      success: true,
      message: 'Категория обновлена',
      data: category
    });
  } catch (error) {
    console.error('Error updating OT category:', error);
    next(error);
  }
};

export const deleteOtCategory = async (req, res, next) => {
  try {
    await assertOtAccess(req.user, { requireAdmin: true });

    const { id } = req.params;

    const category = await OtCategory.findByPk(id);

    if (!category || category.isDeleted) {
      throw new AppError('Категория не найдена', 404);
    }

    await category.update({ isDeleted: true });

    res.json({
      success: true,
      message: 'Категория удалена'
    });
  } catch (error) {
    console.error('Error deleting OT category:', error);
    next(error);
  }
};

export const reorderOtCategory = async (req, res, next) => {
  try {
    await assertOtAccess(req.user, { requireAdmin: true });

    const { id } = req.params;
    const { sortOrder, order } = req.body;

    if (Array.isArray(order)) {
      await Promise.all(
        order.map(({ id: itemId, sortOrder: itemOrder }) =>
          OtCategory.update({ sortOrder: itemOrder }, { where: { id: itemId } })
        )
      );

      return res.json({
        success: true,
        message: 'Порядок категорий обновлен'
      });
    }

    if (sortOrder === undefined) {
      throw new AppError('sortOrder обязателен', 400);
    }

    const category = await OtCategory.findByPk(id);

    if (!category || category.isDeleted) {
      throw new AppError('Категория не найдена', 404);
    }

    await category.update({ sortOrder });

    res.json({
      success: true,
      message: 'Порядок категории обновлен',
      data: category
    });
  } catch (error) {
    console.error('Error reordering OT category:', error);
    next(error);
  }
};
