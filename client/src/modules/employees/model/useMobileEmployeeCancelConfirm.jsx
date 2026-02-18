import { useCallback } from "react";
import { ExclamationCircleOutlined } from "@ant-design/icons";

export const useMobileEmployeeCancelConfirm = ({
  form,
  modal,
  onCancel,
  lastSavedSnapshotRef,
}) => {
  return useCallback(() => {
    const currentSnapshot = JSON.stringify(form.getFieldsValue(true));
    const isDirty =
      form.isFieldsTouched(true) &&
      currentSnapshot !== lastSavedSnapshotRef.current;

    if (!isDirty) {
      onCancel();
      return;
    }

    modal.confirm({
      title: "Вы уверены?",
      icon: <ExclamationCircleOutlined />,
      content: "Все несохраненные данные будут потеряны. Вы хотите выйти?",
      okText: "Да, выйти",
      okType: "danger",
      cancelText: "Остаться",
      onOk() {
        onCancel();
      },
    });
  }, [form, lastSavedSnapshotRef, modal, onCancel]);
};
