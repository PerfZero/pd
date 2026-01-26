import { useEffect, useMemo, useState } from "react";
import {
  Tabs,
  Card,
  Typography,
  Space,
  Empty,
  Result,
  Select,
  Grid,
  Tag,
  Button,
  Tree,
  Tooltip,
  Statistic,
  Row,
  Col,
} from "antd";
import { useAuthStore } from "@/store/authStore";
import settingsService from "@/services/settingsService";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  CheckOutlined,
  CloseOutlined,
  DownloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const OccupationalSafetyPage = () => {
  const { user } = useAuthStore();
  const [defaultCounterpartyId, setDefaultCounterpartyId] = useState(null);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  usePageTitle("Охрана труда", isMobile);

  useEffect(() => {
    const loadDefaultCounterpartyId = async () => {
      try {
        const response = await settingsService.getPublicSettings();
        if (response.success && response.data.defaultCounterpartyId) {
          setDefaultCounterpartyId(response.data.defaultCounterpartyId);
        }
      } catch (error) {
        console.error("Error loading default counterparty ID:", error);
      }
    };

    loadDefaultCounterpartyId();
  }, []);

  const isAdmin = user?.role === "admin";
  const isDefaultCounterpartyUser =
    user?.role === "user" &&
    user?.counterpartyId &&
    user?.counterpartyId === defaultCounterpartyId;
  const isContractorUser =
    user?.role === "user" &&
    user?.counterpartyId &&
    user?.counterpartyId !== defaultCounterpartyId;

  const isAllowed = isAdmin || isContractorUser;

  const contractorTree = useMemo(
    () => [
      {
        key: "cat-1",
        type: "category",
        title: "Категория 1",
        children: [
          {
            key: "cat-1-1",
            type: "category",
            title: "Подкатегория 1.1",
            children: [
              {
                key: "doc-1",
                type: "document",
                name: "Документ 1",
                hasTemplate: true,
                status: "not_uploaded",
                required: true,
              },
              {
                key: "doc-2",
                type: "document",
                name: "Документ 2",
                hasTemplate: true,
                status: "uploaded",
                required: false,
              },
              {
                key: "doc-3",
                type: "document",
                name: "Документ 3",
                hasTemplate: false,
                status: "approved",
                required: true,
              },
              {
                key: "doc-4",
                type: "document",
                name: "Документ 4",
                hasTemplate: false,
                status: "rejected",
                required: true,
              },
            ],
          },
        ],
      },
      {
        key: "cat-2",
        type: "category",
        title: "Категория 2",
        children: [
          {
            key: "doc-5",
            type: "document",
            name: "Документ 5",
            hasTemplate: true,
            status: "not_uploaded",
            required: false,
          },
        ],
      },
    ],
    [],
  );

  const statusMeta = {
    not_uploaded: { text: "Не загружен", color: "red" },
    uploaded: { text: "Загружен", color: "orange" },
    approved: { text: "Подтвержден", color: "green" },
    rejected: { text: "Отклонен", color: "default" },
  };

  const contractorStats = useMemo(() => {
    const docs = [];
    const walk = (nodes) => {
      nodes.forEach((node) => {
        if (node.type === "document") {
          docs.push(node);
          return;
        }
        if (node.children) walk(node.children);
      });
    };
    walk(contractorTree);

    const total = docs.length;
    const uploaded = docs.filter((d) => d.status === "uploaded").length;
    const approved = docs.filter((d) => d.status === "approved").length;
    const rejected = docs.filter((d) => d.status === "rejected").length;
    const missing = docs.filter((d) => d.status === "not_uploaded").length;

    return { total, uploaded, approved, rejected, missing };
  }, [contractorTree]);

  const renderTreeTitle = (node) => {
    if (node.type === "category") {
      return (
        <Space
          size={8}
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <Text strong>{node.title}</Text>
          <Tag color="blue">Категория</Tag>
        </Space>
      );
    }

    const meta = statusMeta[node.status] || statusMeta.not_uploaded;
    return (
      <Space
        size={8}
        style={{ width: "100%", justifyContent: "space-between" }}
        wrap
      >
        <Space size={8} style={{ minWidth: 0 }}>
          <Text style={{ fontWeight: 500 }}>{node.name}</Text>
          {node.required && <Tag color="red">Обязательный</Tag>}
        </Space>
        <Space size={6} wrap>
          {node.hasTemplate && (
            <Tooltip title="Скачать бланк">
              <Button size="small" icon={<DownloadOutlined />} />
            </Tooltip>
          )}
          <Tag color={meta.color}>{meta.text}</Tag>
          {isContractorUser && (
            <Button size="small" icon={<UploadOutlined />}>
              Загрузить
            </Button>
          )}
          {isAdmin && (
            <Space size={4}>
              <Button size="small" icon={<CheckOutlined />} type="primary">
                Подтвердить
              </Button>
              <Button size="small" icon={<CloseOutlined />} danger>
                Отклонить
              </Button>
            </Space>
          )}
        </Space>
      </Space>
    );
  };

  const tabs = useMemo(() => {
    const items = [];

    if (isAdmin) {
      items.push(
        {
          key: "all",
          label: "Все объекты",
          children: (
            <Card size="small">
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Title level={5} style={{ margin: 0 }}>
                  Сводка по объектам
                </Title>
                <Text type="secondary">
                  Здесь будет таблица с количеством допущенных, не допущенных и
                  временно допущенных подрядчиков.
                </Text>
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Card size="small" styles={{ body: { padding: 8 } }}>
                    <Space
                      direction="vertical"
                      size={6}
                      style={{ width: "100%" }}
                    >
                      <Space
                        style={{
                          width: "100%",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text strong>ЖК «Лесной»</Text>
                        <Button size="small">Открыть</Button>
                      </Space>
                      <Space wrap>
                        <Tag color="green">Допущены: 12</Tag>
                        <Tag color="red">Не допущены: 3</Tag>
                        <Tag color="gold">Временно: 2</Tag>
                      </Space>
                    </Space>
                  </Card>
                  <Card size="small" styles={{ body: { padding: 8 } }}>
                    <Space
                      direction="vertical"
                      size={6}
                      style={{ width: "100%" }}
                    >
                      <Space
                        style={{
                          width: "100%",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text strong>Бизнес‑центр «Сфера»</Text>
                        <Button size="small">Открыть</Button>
                      </Space>
                      <Space wrap>
                        <Tag color="green">Допущены: 6</Tag>
                        <Tag color="red">Не допущены: 1</Tag>
                        <Tag color="gold">Временно: 1</Tag>
                      </Space>
                    </Space>
                  </Card>
                  <Card size="small" styles={{ body: { padding: 8 } }}>
                    <Space
                      direction="vertical"
                      size={6}
                      style={{ width: "100%" }}
                    >
                      <Space
                        style={{
                          width: "100%",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text strong>ТЦ «Премьер»</Text>
                        <Button size="small">Открыть</Button>
                      </Space>
                      <Space wrap>
                        <Tag color="green">Допущены: 4</Tag>
                        <Tag color="red">Не допущены: 2</Tag>
                        <Tag color="gold">Временно: 0</Tag>
                      </Space>
                    </Space>
                  </Card>
                </Space>
              </Space>
            </Card>
          ),
        },
        {
          key: "object",
          label: "Объект",
          children: (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Card size="small">
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Text>Выберите объект</Text>
                  <Select placeholder="Объект строительства" size="large" />
                </Space>
              </Card>
              <Card size="small">
                <Row gutter={[12, 12]}>
                  <Col xs={12} sm={8}>
                    <Statistic title="Допущены" value={8} />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic title="Не допущены" value={2} />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic title="Временно допущены" value={1} />
                  </Col>
                </Row>
              </Card>
              <Card size="small">
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Title level={5} style={{ margin: 0 }}>
                    Подрядчики по объекту
                  </Title>
                  <Space
                    direction="vertical"
                    size={8}
                    style={{ width: "100%" }}
                  >
                    <Card size="small" styles={{ body: { padding: 8 } }}>
                      <Space
                        direction="vertical"
                        size={6}
                        style={{ width: "100%" }}
                      >
                        <Space
                          style={{
                            width: "100%",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text strong>ООО «СтройПрофи»</Text>
                          <Tag color="green">Допущен</Tag>
                        </Space>
                        <Space wrap>
                          <Tag color="green">Категория А — заполнен</Tag>
                          <Tag color="green">Категория B — заполнен</Tag>
                          <Tag color="orange">Категория C — 3/5</Tag>
                        </Space>
                        <Button size="small">Открыть подрядчика</Button>
                      </Space>
                    </Card>
                    <Card size="small" styles={{ body: { padding: 8 } }}>
                      <Space
                        direction="vertical"
                        size={6}
                        style={{ width: "100%" }}
                      >
                        <Space
                          style={{
                            width: "100%",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text strong>АО «Монолит»</Text>
                          <Tag color="red">Не допущен</Tag>
                        </Space>
                        <Space wrap>
                          <Tag color="red">Категория А — не заполнен</Tag>
                          <Tag color="orange">Категория B — 2/6</Tag>
                        </Space>
                        <Button size="small">Открыть подрядчика</Button>
                      </Space>
                    </Card>
                    <Card size="small" styles={{ body: { padding: 8 } }}>
                      <Space
                        direction="vertical"
                        size={6}
                        style={{ width: "100%" }}
                      >
                        <Space
                          style={{
                            width: "100%",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text strong>ООО «Сфера»</Text>
                          <Tag color="gold">Временно допущен</Tag>
                        </Space>
                        <Space wrap>
                          <Tag color="green">Категория А — заполнен</Tag>
                          <Tag color="red">Категория B — отклонен</Tag>
                        </Space>
                        <Button size="small">Открыть подрядчика</Button>
                      </Space>
                    </Card>
                  </Space>
                </Space>
              </Card>
            </Space>
          ),
        },
      );
    }

    items.push({
      key: "contractor",
      label: "Подрядчик",
      children: (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Card size="small">
            <Row gutter={[12, 12]}>
              <Col xs={12} sm={8}>
                <Statistic
                  title="Всего документов"
                  value={contractorStats.total}
                />
              </Col>
              <Col xs={12} sm={8}>
                <Statistic title="Загружены" value={contractorStats.uploaded} />
              </Col>
              <Col xs={12} sm={8}>
                <Statistic
                  title="Подтверждены"
                  value={contractorStats.approved}
                />
              </Col>
              <Col xs={12} sm={8}>
                <Statistic title="Отклонены" value={contractorStats.rejected} />
              </Col>
              <Col xs={12} sm={8}>
                <Statistic
                  title="Не загружены"
                  value={contractorStats.missing}
                />
              </Col>
            </Row>
          </Card>
          {isAdmin && (
            <Card size="small">
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Text>Фильтры</Text>
                <Space
                  direction="horizontal"
                  size={8}
                  style={{ width: "100%" }}
                >
                  <Select placeholder="Объект" size="large" />
                  <Select placeholder="Подрядчик" size="large" />
                </Space>
              </Space>
            </Card>
          )}
          <Card size="small">
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Title level={5} style={{ margin: 0 }}>
                Документы подрядчика
              </Title>
              <Tree
                blockNode
                showLine
                defaultExpandAll
                treeData={contractorTree.map((node) => ({
                  key: node.key,
                  title: renderTreeTitle(node),
                  children: node.children?.map((child) => ({
                    key: child.key,
                    title: renderTreeTitle(child),
                    children: child.children?.map((leaf) => ({
                      key: leaf.key,
                      title: renderTreeTitle(leaf),
                    })),
                  })),
                }))}
              />
            </Space>
          </Card>
        </Space>
      ),
    });

    if (isAdmin) {
      items.push({
        key: "settings",
        label: "Настройка",
        children: (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Card size="small">
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Space
                  style={{ width: "100%", justifyContent: "space-between" }}
                >
                  <Title level={5} style={{ margin: 0 }}>
                    Категории
                  </Title>
                  <Button size="small" type="primary">
                    Добавить категорию
                  </Button>
                </Space>
                <Tree
                  blockNode
                  showLine
                  defaultExpandAll
                  treeData={[
                    {
                      key: "cat-a",
                      title: (
                        <Space
                          style={{
                            width: "100%",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text strong>Категория А</Text>
                          <Space size={4}>
                            <Button size="small">Редактировать</Button>
                            <Button size="small" danger>
                              Удалить
                            </Button>
                          </Space>
                        </Space>
                      ),
                      children: [
                        {
                          key: "cat-a-1",
                          title: (
                            <Space
                              style={{
                                width: "100%",
                                justifyContent: "space-between",
                              }}
                            >
                              <Text>Подкатегория А.1</Text>
                              <Space size={4}>
                                <Button size="small">Редактировать</Button>
                                <Button size="small" danger>
                                  Удалить
                                </Button>
                              </Space>
                            </Space>
                          ),
                        },
                      ],
                    },
                  ]}
                />
              </Space>
            </Card>
            <Card size="small">
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Space
                  style={{ width: "100%", justifyContent: "space-between" }}
                >
                  <Title level={5} style={{ margin: 0 }}>
                    Документы в категориях
                  </Title>
                  <Button size="small" type="primary">
                    Добавить документ
                  </Button>
                </Space>
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Card size="small" styles={{ body: { padding: 8 } }}>
                    <Space
                      direction="vertical"
                      size={6}
                      style={{ width: "100%" }}
                    >
                      <Space
                        style={{
                          width: "100%",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text strong>Инструктаж по ОТ</Text>
                        <Tag color="red">Обязательный</Tag>
                      </Space>
                      <Space wrap>
                        <Button size="small">Бланк</Button>
                        <Button size="small">Редактировать</Button>
                        <Button size="small" danger>
                          Удалить
                        </Button>
                      </Space>
                    </Space>
                  </Card>
                  <Card size="small" styles={{ body: { padding: 8 } }}>
                    <Space
                      direction="vertical"
                      size={6}
                      style={{ width: "100%" }}
                    >
                      <Space
                        style={{
                          width: "100%",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text strong>Медосмотр</Text>
                        <Tag color="default">Необязательный</Tag>
                      </Space>
                      <Space wrap>
                        <Button size="small">Бланк</Button>
                        <Button size="small">Редактировать</Button>
                        <Button size="small" danger>
                          Удалить
                        </Button>
                      </Space>
                    </Space>
                  </Card>
                </Space>
              </Space>
            </Card>
            <Card size="small">
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Space
                  style={{ width: "100%", justifyContent: "space-between" }}
                >
                  <Title level={5} style={{ margin: 0 }}>
                    Библиотека шаблонов
                  </Title>
                  <Button size="small" type="primary">
                    Добавить шаблон
                  </Button>
                </Space>
                <Space wrap>
                  <Tag color="blue">Приказ</Tag>
                  <Tag color="blue">Доверенность</Tag>
                  <Tag color="blue">Протокол</Tag>
                </Space>
                <Space wrap>
                  <Button size="small">Скачать</Button>
                  <Button size="small">Редактировать</Button>
                  <Button size="small" danger>
                    Удалить
                  </Button>
                </Space>
              </Space>
            </Card>
            <Card size="small">
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Space
                  style={{ width: "100%", justifyContent: "space-between" }}
                >
                  <Title level={5} style={{ margin: 0 }}>
                    Инструкции для подрядчиков
                  </Title>
                  <Button size="small" type="primary">
                    Редактировать
                  </Button>
                </Space>
                <Text type="secondary">
                  Короткая инструкция по заполнению и загрузке документов.
                </Text>
                <Space wrap>
                  <Button size="small" icon={<DownloadOutlined />}>
                    Скачать инструкцию
                  </Button>
                  <Button size="small" icon={<UploadOutlined />}>
                    Загрузить файл
                  </Button>
                </Space>
              </Space>
            </Card>
          </Space>
        ),
      });
    }

    return items;
  }, [isAdmin, contractorStats, contractorTree, isContractorUser]);

  if (!isAllowed) {
    return (
      <Result
        status="403"
        title="Нет доступа"
        subTitle="Раздел доступен только для подрядчиков и администраторов"
      />
    );
  }

  if (isDefaultCounterpartyUser) {
    return (
      <Result
        status="403"
        title="Нет доступа"
        subTitle="Для контрагента по умолчанию доступ к разделу закрыт"
      />
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Title level={3} style={{ margin: 0 }}>
          Охрана труда
        </Title>
        <Tabs items={tabs} />
      </Space>
    </div>
  );
};

export default OccupationalSafetyPage;
