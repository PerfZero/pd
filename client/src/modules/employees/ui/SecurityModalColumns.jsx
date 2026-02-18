import { Button, Tooltip } from "antd";
import { LockOutlined, UnlockOutlined } from "@ant-design/icons";
import {
  formatKigDisplay,
  isEmployeeBlockedBySecureStatus,
  isEmployeeBlockCompleted,
} from "@/modules/employees/lib/securityModalUtils";

export const buildSecurityModalColumns = ({ onBlock, onUnblock }) => [
  {
    title: "ФИО",
    key: "fullName",
    render: (_, record) =>
      `${record.lastName} ${record.firstName} ${record.middleName || ""}`,
  },
  {
    title: "Контрагент",
    key: "counterparty",
    render: (_, record) => {
      const counterparties = record.employeeCounterpartyMappings
        ?.map((mapping) => mapping.counterparty?.name)
        .filter(Boolean);
      return [...new Set(counterparties)].join(", ") || "-";
    },
  },
  {
    title: "ИНН",
    dataIndex: "inn",
    key: "inn",
  },
  {
    title: "КИГ",
    dataIndex: "kig",
    key: "kig",
    render: (text) => formatKigDisplay(text),
  },
  {
    title: "Патент",
    dataIndex: "patentNumber",
    key: "patentNumber",
    render: (text) => text || "-",
  },
  {
    title: "Блокировка",
    key: "action",
    width: 120,
    align: "center",
    render: (_, record) => {
      const isBlocked = isEmployeeBlockedBySecureStatus(record);
      const isBlockCompleted = isEmployeeBlockCompleted(record);

      if (!isBlocked) {
        return (
          <Tooltip title="Заблокировать">
            <Button
              type="primary"
              danger
              size="small"
              shape="circle"
              icon={<LockOutlined />}
              onClick={() => onBlock(record.id)}
            />
          </Tooltip>
        );
      }

      return (
        <Tooltip title="Разблокировать">
          <Button
            type="primary"
            size="small"
            shape="circle"
            icon={<UnlockOutlined />}
            onClick={() => onUnblock(record.id)}
            disabled={isBlockCompleted}
            style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
          />
        </Tooltip>
      );
    },
  },
];
