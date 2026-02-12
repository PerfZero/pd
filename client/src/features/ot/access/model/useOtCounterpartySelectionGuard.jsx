import { useEffect } from "react";

const useOtCounterpartySelectionGuard = ({
  isStaff,
  selectedConstructionSiteId,
  selectedCounterpartyId,
  counterpartyOptions,
  setSelectedCounterpartyId,
}) => {
  useEffect(() => {
    if (!isStaff) return;
    if (!selectedConstructionSiteId) {
      if (selectedCounterpartyId) {
        setSelectedCounterpartyId(null);
      }
      return;
    }

    if (!selectedCounterpartyId) return;

    const allowedIds = new Set(
      counterpartyOptions.map((option) => option.value),
    );

    if (!allowedIds.has(selectedCounterpartyId)) {
      setSelectedCounterpartyId(null);
    }
  }, [
    isStaff,
    selectedConstructionSiteId,
    selectedCounterpartyId,
    counterpartyOptions,
    setSelectedCounterpartyId,
  ]);
};

export default useOtCounterpartySelectionGuard;
