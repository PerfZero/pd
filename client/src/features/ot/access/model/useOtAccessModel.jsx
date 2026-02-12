import { useEffect, useMemo } from "react";

const useOtAccessModel = ({
  user,
  defaultCounterpartyId,
  activeTab,
  setActiveTab,
  selectedConstructionSiteId,
  selectedCounterpartyId,
}) => {
  const isAdmin = user?.role === "admin";
  const isOtAdmin = user?.role === "ot_admin";
  const isOtEngineer = user?.role === "ot_engineer";
  const isStaff = isAdmin || isOtAdmin || isOtEngineer;
  const canManageSettings = isAdmin || isOtAdmin;
  const isDefaultCounterpartyUser = false;
  const isContractorUser = user?.role === "user" && user?.counterpartyId;

  const isAllowed = isStaff || isContractorUser;

  const allowedTabs = useMemo(() => {
    if (!isAllowed) {
      return [];
    }
    if (isStaff) {
      const staffTabs = ["all", "object", "contractor"];
      if (canManageSettings) {
        staffTabs.push("settings");
      }
      return staffTabs;
    }
    return ["contractor"];
  }, [isAllowed, isStaff, canManageSettings]);

  useEffect(() => {
    if (!allowedTabs.length) return;
    if (!activeTab || !allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [activeTab, allowedTabs, setActiveTab]);

  const counterpartyId = useMemo(() => {
    if (isStaff) {
      return selectedCounterpartyId || null;
    }
    return user?.counterpartyId || null;
  }, [isStaff, selectedCounterpartyId, user?.counterpartyId]);

  const constructionSiteId = useMemo(
    () => selectedConstructionSiteId || null,
    [selectedConstructionSiteId],
  );

  const hasContractorSelection = useMemo(() => {
    if (isStaff) {
      return !!selectedConstructionSiteId && !!selectedCounterpartyId;
    }
    return !!selectedConstructionSiteId && !!user?.counterpartyId;
  }, [
    isStaff,
    selectedConstructionSiteId,
    selectedCounterpartyId,
    user?.counterpartyId,
  ]);

  const contractorCommentEnabled = useMemo(() => {
    if (!selectedConstructionSiteId) return false;
    const selectedCounterparty = isStaff
      ? selectedCounterpartyId
      : user?.counterpartyId;
    return !!selectedCounterparty;
  }, [
    isStaff,
    selectedConstructionSiteId,
    selectedCounterpartyId,
    user?.counterpartyId,
  ]);

  return {
    isStaff,
    canManageSettings,
    isDefaultCounterpartyUser,
    isContractorUser,
    isAllowed,
    counterpartyId,
    constructionSiteId,
    hasContractorSelection,
    contractorCommentEnabled,
  };
};

export default useOtAccessModel;
