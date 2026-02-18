import { Form, Input, Select, Typography } from "antd";
import dayjs from "dayjs";
import EmployeeFileUpload from "./EmployeeFileUpload";

const { Title, Text } = Typography;
const { TextArea } = Input;
const DATE_FORMAT = "DD.MM.YYYY";

export const buildEmployeeViewDrawerFormData = (employee) => {
  if (!employee) {
    return null;
  }

  return {
    lastName: employee.lastName,
    firstName: employee.firstName,
    middleName: employee.middleName,
    positionId: employee.positionId,
    citizenshipId: employee.citizenshipId,
    birthDate: employee.birthDate
      ? dayjs(employee.birthDate).format(DATE_FORMAT)
      : null,
    registrationAddress: employee.registrationAddress,
    phone: employee.phone,
    note: employee.note,
    inn: employee.inn,
    snils: employee.snils,
    kig: employee.kig,
    passportNumber: employee.passportNumber,
    passportDate: employee.passportDate
      ? dayjs(employee.passportDate).format(DATE_FORMAT)
      : null,
    passportIssuer: employee.passportIssuer,
    patentNumber: employee.patentNumber,
    patentIssueDate: employee.patentIssueDate
      ? dayjs(employee.patentIssueDate).format(DATE_FORMAT)
      : null,
    blankNumber: employee.blankNumber,
    isFired: employee.isFired,
    isInactive: employee.isInactive,
  };
};

export const buildEmployeeViewDrawerItems = ({
  employee,
  positions,
  citizenships,
  requiresPatent,
  canEditConstructionSite,
}) => {
  const items = [
    {
      key: "personal",
      label: (
        <Title level={5} style={{ margin: 0 }}>
          📋 Личная информация
        </Title>
      ),
      children: (
        <>
          <Form.Item label="Фамилия" name="lastName">
            <Input disabled size="large" />
          </Form.Item>

          <Form.Item label="Имя" name="firstName">
            <Input disabled size="large" />
          </Form.Item>

          <Form.Item label="Отчество" name="middleName">
            <Input
              disabled
              size="large"
              placeholder={employee?.middleName ? undefined : ""}
            />
          </Form.Item>

          <Form.Item label="Должность" name="positionId">
            <Select placeholder="Выберите должность" size="large" disabled>
              {positions.map((position) => (
                <Select.Option key={position.id} value={position.id}>
                  {position.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Гражданство" name="citizenshipId">
            <Select placeholder="Выберите гражданство" size="large" disabled>
              {citizenships.map((citizenship) => (
                <Select.Option key={citizenship.id} value={citizenship.id}>
                  {citizenship.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Дата рождения" name="birthDate">
            <Input size="large" disabled />
          </Form.Item>

          <Form.Item label="Адрес регистрации" name="registrationAddress">
            <TextArea
              placeholder="г. Москва, ул. Ленина, д. 1"
              rows={3}
              size="large"
              disabled
            />
          </Form.Item>

          <Form.Item label="Телефон" name="phone">
            <Input
              placeholder={employee?.phone ? undefined : ""}
              size="large"
              disabled
            />
          </Form.Item>

          <Form.Item label="Примечание" name="note">
            <TextArea
              rows={2}
              placeholder={employee?.note ? undefined : ""}
              size="large"
              disabled
            />
          </Form.Item>
        </>
      ),
    },
    {
      key: "documents",
      label: (
        <Title level={5} style={{ margin: 0 }}>
          📄 Документы
        </Title>
      ),
      children: (
        <>
          <Form.Item label="ИНН" name="inn">
            <Input
              placeholder={employee?.inn ? undefined : ""}
              size="large"
              disabled
            />
          </Form.Item>

          <Form.Item label="СНИЛС" name="snils">
            <Input
              placeholder={employee?.snils ? undefined : ""}
              size="large"
              disabled
            />
          </Form.Item>

          {requiresPatent ? (
            <Form.Item label="КИГ (Карта иностранного гражданина)" name="kig">
              <Input
                placeholder={employee?.kig ? undefined : ""}
                size="large"
                maxLength={10}
                disabled
              />
            </Form.Item>
          ) : null}

          <Form.Item label="Паспорт (серия и номер)" name="passportNumber">
            <Input
              placeholder={employee?.passportNumber ? undefined : ""}
              size="large"
              disabled
            />
          </Form.Item>

          <Form.Item label="Дата выдачи паспорта" name="passportDate">
            <Input size="large" disabled />
          </Form.Item>

          <Form.Item label="Кем выдан паспорт" name="passportIssuer">
            <TextArea
              placeholder={employee?.passportIssuer ? undefined : ""}
              rows={3}
              size="large"
              disabled
            />
          </Form.Item>
        </>
      ),
    },
  ];

  if (requiresPatent) {
    items.push({
      key: "patent",
      label: (
        <Title level={5} style={{ margin: 0 }}>
          📑 Патент
        </Title>
      ),
      children: (
        <>
          <Form.Item label="Номер патента" name="patentNumber">
            <Input
              placeholder={employee?.patentNumber ? undefined : ""}
              size="large"
              disabled
            />
          </Form.Item>

          <Form.Item label="Дата выдачи патента" name="patentIssueDate">
            <Input size="large" disabled />
          </Form.Item>

          <Form.Item label="Номер бланка" name="blankNumber">
            <Input
              placeholder={employee?.blankNumber ? undefined : ""}
              size="large"
              maxLength={9}
              disabled
            />
          </Form.Item>
        </>
      ),
    });
  }

  if (employee?.id) {
    items.push({
      key: "files",
      label: (
        <Title level={5} style={{ margin: 0 }}>
          📸 Фото документов
        </Title>
      ),
      children: (
        <EmployeeFileUpload
          employeeId={employee.id}
          readonly={true}
          hideUploadButton={true}
        />
      ),
    });
  }

  if (employee?.id && canEditConstructionSite) {
    items.push({
      key: "statuses",
      label: (
        <Title level={5} style={{ margin: 0 }}>
          ⚙️ Статусы
        </Title>
      ),
      children: (
        <>
          <div style={{ padding: "8px 0" }}>
            <Text>
              Уволен: <strong>{employee.isFired ? "Да" : "Нет"}</strong>
            </Text>
          </div>
          <div style={{ padding: "8px 0" }}>
            <Text>
              Неактивен (временно):{" "}
              <strong>{employee.isInactive ? "Да" : "Нет"}</strong>
            </Text>
          </div>
        </>
      ),
    });
  }

  return items;
};
