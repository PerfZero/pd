import { useEffect } from "react";
import { counterpartyService } from "@/services/counterpartyService";

export const useMobileEmployeeFormInitialization = ({
  employee,
  employeeIdOnLoad,
  setEmployeeIdOnLoad,
  citizenshipsLength,
  positionsLength,
  initializeEmployeeData,
  form,
  setPassportType,
  lastSavedSnapshotRef,
  handleCitizenshipChange,
  userCounterpartyId,
  setAvailableCounterparties,
  setLoadingCounterparties,
}) => {
  useEffect(() => {
    if (citizenshipsLength && positionsLength) {
      if (employee?.id !== employeeIdOnLoad) {
        const formData = initializeEmployeeData(true);
        if (formData) {
          form.setFieldsValue(formData);
          lastSavedSnapshotRef.current = JSON.stringify(form.getFieldsValue(true));

          if (formData.passportType) {
            setPassportType(formData.passportType);
          }

          if (employee?.citizenshipId) {
            handleCitizenshipChange(employee.citizenshipId);
          }
        } else {
          form.resetFields();
          setPassportType(null);
          lastSavedSnapshotRef.current = JSON.stringify(form.getFieldsValue(true));
        }
        setEmployeeIdOnLoad(employee?.id);
      }
    }
  }, [
    citizenshipsLength,
    employee?.citizenshipId,
    employee?.id,
    employeeIdOnLoad,
    form,
    handleCitizenshipChange,
    initializeEmployeeData,
    lastSavedSnapshotRef,
    positionsLength,
    setEmployeeIdOnLoad,
    setPassportType,
  ]);

  useEffect(() => {
    const loadCounterparties = async () => {
      setLoadingCounterparties(true);
      try {
        const response = await counterpartyService.getAvailable();
        if (response.data.success) {
          setAvailableCounterparties(response.data.data);

          if (
            !employee?.id &&
            userCounterpartyId &&
            !form.getFieldValue("counterpartyId")
          ) {
            form.setFieldsValue({ counterpartyId: userCounterpartyId });
          }
        }
      } catch (error) {
        console.error("Error loading counterparties:", error);
      } finally {
        setLoadingCounterparties(false);
      }
    };

    if (userCounterpartyId) {
      loadCounterparties();
    }
  }, [
    employee?.id,
    form,
    setAvailableCounterparties,
    setLoadingCounterparties,
    userCounterpartyId,
  ]);
};
