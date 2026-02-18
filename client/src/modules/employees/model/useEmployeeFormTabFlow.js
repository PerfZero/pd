import { useCallback, useEffect } from "react";

export const useEmployeeFormTabFlow = ({
  requiresPatent,
  checkingCitizenship,
  activeTab,
  setActiveTab,
  visible,
  requiredFieldsByTab,
  tabsValidation,
}) => {
  useEffect(() => {
    if (checkingCitizenship) return;

    if (!requiresPatent && activeTab === "3") {
      setActiveTab("1");
    }
  }, [requiresPatent, activeTab, checkingCitizenship, visible, setActiveTab]);

  const allTabsValid = useCallback(() => {
    const requiredTabs = Object.keys(requiredFieldsByTab);
    return requiredTabs.every((tabKey) => tabsValidation[tabKey] === true);
  }, [requiredFieldsByTab, tabsValidation]);

  const handleNext = useCallback(() => {
    const tabOrder = requiresPatent ? ["1", "2", "3"] : ["1", "2"];
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    }
  }, [activeTab, requiresPatent, setActiveTab]);

  return {
    allTabsValid,
    handleNext,
  };
};
