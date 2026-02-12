export const getInitialLinkingMode = (employee) => employee?.linkingMode === true;

export const applyLinkingModePayload = (formattedValues, employee, linkingMode) => {
  if (!linkingMode || !employee?.id) return formattedValues;

  return {
    ...formattedValues,
    employeeId: employee.id,
    id: undefined,
  };
};

export const shouldStayOpenAfterSave = (linkingMode) => linkingMode === true;
