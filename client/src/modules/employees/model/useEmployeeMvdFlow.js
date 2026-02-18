import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildMvdPrefillValues,
  normalizeString,
} from "@/modules/employees/lib/employeeOcrMvdUtils";
import mvdService from "@/services/mvdService";

export const useEmployeeMvdFlow = ({ visible, form, mvdForm, message }) => {
  const [mvdModalVisible, setMvdModalVisible] = useState(false);
  const [mvdMetaLoading, setMvdMetaLoading] = useState(false);
  const [mvdCheckLoading, setMvdCheckLoading] = useState(false);
  const [mvdSupportedTypes, setMvdSupportedTypes] = useState([]);
  const [mvdSelectedType, setMvdSelectedType] = useState(null);
  const [mvdResult, setMvdResult] = useState(null);
  const [mvdErrorText, setMvdErrorText] = useState("");

  useEffect(() => {
    if (!visible) {
      setMvdModalVisible(false);
      setMvdCheckLoading(false);
      setMvdResult(null);
      setMvdErrorText("");
      setMvdSelectedType(null);
      mvdForm.resetFields();
    }
  }, [mvdForm, visible]);

  const selectedMvdTypeMeta =
    mvdSupportedTypes.find((item) => item.type === mvdSelectedType) || null;

  const selectedMvdParams = useMemo(
    () => selectedMvdTypeMeta?.requiredParams || [],
    [selectedMvdTypeMeta],
  );

  const fetchMvdMeta = useCallback(async () => {
    setMvdMetaLoading(true);
    try {
      const response = await mvdService.getMeta();
      const supportedTypes = response?.data?.supportedTypes || [];
      setMvdSupportedTypes(supportedTypes);
      return supportedTypes;
    } catch (error) {
      console.error("Error loading MVD meta:", error);
      message.error(error?.userMessage || "Не удалось загрузить типы проверок МВД");
      return [];
    } finally {
      setMvdMetaLoading(false);
    }
  }, [message]);

  const handleMvdTypeChange = useCallback(
    (nextType) => {
      setMvdSelectedType(nextType);
      setMvdResult(null);
      setMvdErrorText("");
      mvdForm.resetFields();
      const prefill = buildMvdPrefillValues(nextType, form.getFieldsValue(true));
      mvdForm.setFieldsValue(prefill);
    },
    [form, mvdForm],
  );

  const handleOpenMvdModal = useCallback(async () => {
    setMvdModalVisible(true);
    setMvdResult(null);
    setMvdErrorText("");

    let types = mvdSupportedTypes;
    if (types.length === 0) {
      types = await fetchMvdMeta();
    }

    const initialType = mvdSelectedType || types[0]?.type || null;
    if (initialType) {
      handleMvdTypeChange(initialType);
    }
  }, [fetchMvdMeta, handleMvdTypeChange, mvdSelectedType, mvdSupportedTypes]);

  const handleRunMvdCheck = useCallback(async () => {
    if (!mvdSelectedType) {
      message.warning("Выберите тип проверки МВД");
      return;
    }

    const selectedTypeMeta = mvdSupportedTypes.find(
      (item) => item.type === mvdSelectedType,
    );
    const requiredParams = selectedTypeMeta?.requiredParams || [];

    try {
      setMvdCheckLoading(true);
      setMvdErrorText("");

      await mvdForm.validateFields(requiredParams);
      const formValues = mvdForm.getFieldsValue(requiredParams);
      const params = {};
      requiredParams.forEach((key) => {
        const value = normalizeString(formValues[key]);
        if (value) {
          params[key] = value;
        }
      });

      const response = await mvdService.check({
        type: mvdSelectedType,
        params,
      });

      setMvdResult(response?.data || response || null);
      message.success("Проверка МВД выполнена");
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      console.error("MVD check error:", error);
      const errorText = error?.userMessage || "Не удалось выполнить проверку МВД";
      setMvdErrorText(errorText);
      message.error(errorText);
    } finally {
      setMvdCheckLoading(false);
    }
  }, [message, mvdForm, mvdSelectedType, mvdSupportedTypes]);

  const handleCloseMvdModal = useCallback(() => {
    setMvdModalVisible(false);
  }, []);

  return {
    mvdModalVisible,
    mvdMetaLoading,
    mvdCheckLoading,
    mvdSupportedTypes,
    mvdSelectedType,
    mvdResult,
    mvdErrorText,
    selectedMvdParams,
    handleMvdTypeChange,
    handleOpenMvdModal,
    handleRunMvdCheck,
    handleCloseMvdModal,
  };
};
