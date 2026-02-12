export const buildCategoryOptions = (categories = []) => {
  const walk = (nodes, depth = 0) =>
    (nodes || []).flatMap((node) => {
      const label = `${"— ".repeat(depth)}${node.name}`;
      return [
        { label, value: node.id, selectLabel: node.name },
        ...walk(node.children || [], depth + 1),
      ];
    });

  return walk(categories, 0);
};

export default buildCategoryOptions;
