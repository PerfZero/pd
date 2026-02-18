import { useCallback, useState } from "react";
import { employeeStatusService } from "@/services/employeeStatusService";
import { invalidateCache } from "@/utils/requestCache";

export const useEmployeeStatusActions = ({ employee, messageApi, onAfterAction }) => {
  const [fireLoading, setFireLoading] = useState(false);
  const [activateLoading, setActivateLoading] = useState(false);

  const executeStatusAction = useCallback(
    async ({ request, setLoadingState, successMessage, fallbackErrorMessage, logPrefix }) => {
      if (!employee?.id) {
        return;
      }

      try {
        setLoadingState(true);
        await request(employee.id);
        invalidateCache(`employees:getById:${employee.id}`);
        messageApi.success(successMessage);
        setTimeout(() => {
          onAfterAction?.();
        }, 500);
      } catch (error) {
        console.error(logPrefix, error);
        messageApi.error(fallbackErrorMessage);
      } finally {
        setLoadingState(false);
      }
    },
    [employee?.id, messageApi, onAfterAction],
  );

  const handleFire = useCallback(
    () =>
      executeStatusAction({
        request: employeeStatusService.fireEmployee,
        setLoadingState: setFireLoading,
        successMessage: `Сотрудник ${employee?.lastName || ""} ${employee?.firstName || ""} уволен`,
        fallbackErrorMessage: "Ошибка при увольнении сотрудника",
        logPrefix: "Error firing employee:",
      }),
    [employee?.firstName, employee?.lastName, executeStatusAction],
  );

  const handleReinstate = useCallback(
    () =>
      executeStatusAction({
        request: employeeStatusService.reinstateEmployee,
        setLoadingState: setActivateLoading,
        successMessage: `Сотрудник ${employee?.lastName || ""} ${employee?.firstName || ""} восстановлен`,
        fallbackErrorMessage: "Ошибка при восстановлении сотрудника",
        logPrefix: "Error reinstating employee:",
      }),
    [employee?.firstName, employee?.lastName, executeStatusAction],
  );

  const handleDeactivate = useCallback(
    () =>
      executeStatusAction({
        request: employeeStatusService.deactivateEmployee,
        setLoadingState: setFireLoading,
        successMessage: `Сотрудник ${employee?.lastName || ""} ${employee?.firstName || ""} деактивирован`,
        fallbackErrorMessage: "Ошибка при деактивации сотрудника",
        logPrefix: "Error deactivating employee:",
      }),
    [employee?.firstName, employee?.lastName, executeStatusAction],
  );

  const handleActivate = useCallback(
    () =>
      executeStatusAction({
        request: employeeStatusService.activateEmployee,
        setLoadingState: setActivateLoading,
        successMessage: `Сотрудник ${employee?.lastName || ""} ${employee?.firstName || ""} активирован`,
        fallbackErrorMessage: "Ошибка при активации сотрудника",
        logPrefix: "Error activating employee:",
      }),
    [employee?.firstName, employee?.lastName, executeStatusAction],
  );

  return {
    fireLoading,
    activateLoading,
    handleFire,
    handleReinstate,
    handleDeactivate,
    handleActivate,
  };
};
