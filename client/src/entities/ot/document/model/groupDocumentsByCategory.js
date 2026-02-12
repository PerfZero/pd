export const groupDocumentsByCategory = (documents = []) => {
  const grouped = new Map();

  (documents || []).forEach((doc) => {
    if (!doc?.categoryId) return;
    const key = String(doc.categoryId);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(doc);
  });

  grouped.forEach((docs, key) => {
    grouped.set(
      key,
      [...docs].sort((a, b) => {
        const aOrder = Number(a?.sortOrder || 0);
        const bOrder = Number(b?.sortOrder || 0);
        if (aOrder !== bOrder) return aOrder - bOrder;
        return (a?.name || "").localeCompare(b?.name || "", "ru");
      }),
    );
  });

  return grouped;
};

export default groupDocumentsByCategory;
