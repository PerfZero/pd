import { useMemo } from "react";
import { useEmployeeOcrFlow } from "@/modules/employees/model/useEmployeeOcrFlow";
import { useEmployeeMvdFlow } from "@/modules/employees/model/useEmployeeMvdFlow";

export const useEmployeeFormOcrMvd = ({
  visible,
  employeeId,
  form,
  mvdForm,
  message,
  passportType,
  setPassportType,
  citizenships,
  updateSelectedCitizenship,
}) => {
  const ocrFlow = useEmployeeOcrFlow({
    visible,
    employeeId,
    form,
    message,
    passportType,
    setPassportType,
    citizenships,
    updateSelectedCitizenship,
  });

  const mvdFlow = useEmployeeMvdFlow({
    visible,
    form,
    mvdForm,
    message,
  });

  return useMemo(
    () => ({
      ...ocrFlow,
      ...mvdFlow,
    }),
    [mvdFlow, ocrFlow],
  );
};
