import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Tabs,
  Card,
  Typography,
  Space,
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
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Upload,
  List,
  Divider,
  Empty,
  Switch,
} from "antd";
import { useAuthStore } from "@/store/authStore";
import settingsService from "@/services/settingsService";
import otService from "@/services/otService";
import { constructionSiteService } from "@/services/constructionSiteService";
import { counterpartyService } from "@/services/counterpartyService";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useTranslation } from "react-i18next";
import {
  CheckOutlined,
  CloseOutlined,
  DownloadOutlined,
  UploadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const OccupationalSafetyPage = () => {
  const { user } = useAuthStore();
  const [defaultCounterpartyId, setDefaultCounterpartyId] = useState(null);
  const [constructionSites, setConstructionSites] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [selectedConstructionSiteId, setSelectedConstructionSiteId] =
    useState(null);
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState(null);
  const [contractorCategories, setContractorCategories] = useState([]);
  const [contractorStats, setContractorStats] = useState({
    total: 0,
    uploaded: 0,
    approved: 0,
    rejected: 0,
    missing: 0,
  });
  const [contractorLoading, setContractorLoading] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState(null);
  const uploadInputRef = useRef(null);
  const uploadTargetRef = useRef(null);
  const templateInputRef = useRef(null);
  const templateUploadTargetRef = useRef(null);
  const [activeTab, setActiveTab] = useState("contractor");
  const [settingsCategories, setSettingsCategories] = useState([]);
  const [settingsDocuments, setSettingsDocuments] = useState([]);
  const [settingsTemplates, setSettingsTemplates] = useState([]);
  const [settingsInstructions, setSettingsInstructions] = useState([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [contractorComments, setContractorComments] = useState([]);
  const [contractorCommentsLoading, setContractorCommentsLoading] =
    useState(false);
  const [contractorCommentText, setContractorCommentText] = useState("");
  const [documentComments, setDocumentComments] = useState([]);
  const [documentCommentsLoading, setDocumentCommentsLoading] = useState(false);
  const [documentCommentText, setDocumentCommentText] = useState("");
  const [documentCommentModalOpen, setDocumentCommentModalOpen] =
    useState(false);
  const [documentCommentTarget, setDocumentCommentTarget] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [instructionModalOpen, setInstructionModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingDocument, setEditingDocument] = useState(null);
  const [templateUploadingId, setTemplateUploadingId] = useState(null);
  const [templateFileList, setTemplateFileList] = useState([]);
  const [instructionFileList, setInstructionFileList] = useState([]);
  const [objectStatuses, setObjectStatuses] = useState([]);
  const [objectStatusLoading, setObjectStatusLoading] = useState(false);
  const [allSiteSummaries, setAllSiteSummaries] = useState([]);
  const [allSiteLoading, setAllSiteLoading] = useState(false);
  const allSiteRequestRef = useRef(0);
  const [categoryForm] = Form.useForm();
  const [documentForm] = Form.useForm();
  const [templateForm] = Form.useForm();
  const [instructionForm] = Form.useForm();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { t } = useTranslation();
  const selectMinWidth = 100;
  const selectMaxWidth = 250;
  const selectCollapsedStyle = { width: selectMinWidth };
  const selectFullStyle = { width: "100%", minWidth: selectMinWidth };
  const selectDropdownStyle = {
    minWidth: selectMinWidth,
    maxWidth: selectMaxWidth,
  };

  usePageTitle(t("ot.title"), isMobile);

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
  const isOtAdmin = user?.role === "ot_admin";
  const isOtEngineer = user?.role === "ot_engineer";
  const isStaff = isAdmin || isOtAdmin || isOtEngineer;
  const canManageSettings = isAdmin || isOtAdmin;
  const isDefaultCounterpartyUser =
    user?.role === "user" &&
    user?.counterpartyId &&
    user?.counterpartyId === defaultCounterpartyId;
  const isContractorUser =
    user?.role === "user" &&
    user?.counterpartyId &&
    user?.counterpartyId !== defaultCounterpartyId;

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
  }, [activeTab, allowedTabs]);

  const loadContractorDocs = async ({
    constructionSiteId,
    counterpartyId,
    isStaffMode,
  }) => {
    if (!constructionSiteId || !counterpartyId) return;

    try {
      setContractorLoading(true);
      const params = { constructionSiteId };
      if (isStaffMode) {
        params.counterpartyId = counterpartyId;
      }

      const response = await otService.getContractorDocs(params);
      const payload = response.data?.data || {};
      const stats = payload.stats || {};

      setContractorCategories(payload.categories || []);
      setContractorStats({
        total: stats.total || 0,
        uploaded: stats.uploaded || 0,
        approved: stats.approved || 0,
        rejected: stats.rejected || 0,
        missing: stats.not_uploaded || 0,
      });
    } catch (error) {
      console.error("Error loading OT contractor docs:", error);
      message.error("Ошибка при загрузке документов подрядчика");
    } finally {
      setContractorLoading(false);
    }
  };

  const loadContractorComments = async ({
    constructionSiteId,
    counterpartyId,
  }) => {
    if (!constructionSiteId || !counterpartyId) return;

    try {
      setContractorCommentsLoading(true);
      const response = await otService.getComments({
        type: "contractor",
        counterpartyId,
        constructionSiteId,
      });
      setContractorComments(response.data?.data || []);
    } catch (error) {
      console.error("Error loading OT contractor comments:", error);
      message.error("Ошибка при загрузке комментариев");
    } finally {
      setContractorCommentsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAllowed) return;

    const loadInitialData = async () => {
      try {
        if (isStaff) {
          const [sitesResponse, counterpartiesResponse] = await Promise.all([
            constructionSiteService.getAll({ limit: 1000 }),
            counterpartyService.getAll({ limit: 1000 }),
          ]);

          const sites =
            sitesResponse.data?.data?.constructionSites ||
            sitesResponse.data?.data ||
            [];
          const counterpartyList =
            counterpartiesResponse.data?.data?.counterparties ||
            counterpartiesResponse.data?.data ||
            [];

          setConstructionSites(sites);
          setCounterparties(counterpartyList);
        } else if (isContractorUser && user?.counterpartyId) {
          const response = await counterpartyService.getConstructionSites(
            user.counterpartyId,
          );
          const sites = response.data?.data || [];
          setConstructionSites(sites);
        }
      } catch (error) {
        console.error("Error loading OT initial data:", error);
        message.error("Ошибка при загрузке данных ОТ");
      }
    };

    loadInitialData();
  }, [
    isAllowed,
    isStaff,
    isContractorUser,
    user?.counterpartyId,
    selectedConstructionSiteId,
    selectedCounterpartyId,
  ]);

  useEffect(() => {
    if (!isAllowed) return;

    const counterpartyId = isStaff
      ? selectedCounterpartyId
      : user?.counterpartyId;

    if (!selectedConstructionSiteId || !counterpartyId) return;

    loadContractorDocs({
      constructionSiteId: selectedConstructionSiteId,
      counterpartyId,
      isStaffMode: isStaff,
    });
  }, [
    isAllowed,
    isStaff,
    selectedConstructionSiteId,
    selectedCounterpartyId,
    user?.counterpartyId,
  ]);

  useEffect(() => {
    if (!isAllowed) return;

    const counterpartyId = isStaff
      ? selectedCounterpartyId
      : user?.counterpartyId;

    if (!selectedConstructionSiteId || !counterpartyId) return;

    loadContractorComments({
      constructionSiteId: selectedConstructionSiteId,
      counterpartyId,
    });
  }, [
    isAllowed,
    isStaff,
    selectedConstructionSiteId,
    selectedCounterpartyId,
    user?.counterpartyId,
  ]);

  const loadSettingsData = useCallback(async () => {
    if (!canManageSettings) return;

    try {
      setSettingsLoading(true);
      const [categoriesRes, documentsRes, templatesRes, instructionsRes] =
        await Promise.all([
          otService.getCategories(),
          otService.getDocuments(),
          otService.getTemplates(),
          otService.getInstructions(),
        ]);

      const categories = categoriesRes.data?.data || [];
      const documents = documentsRes.data?.data || [];
      const templates = templatesRes.data?.data || [];
      const instructions = instructionsRes.data?.data || [];

      setSettingsCategories(categories);
      setSettingsDocuments(documents);
      setSettingsTemplates(templates);
      setSettingsInstructions(instructions);

      if (
        (!selectedCategoryId || selectedCategoryId === "all") &&
        categories.length > 0
      ) {
        setSelectedCategoryId(categories[0].id);
      }
    } catch (error) {
      console.error("Error loading OT settings:", error);
      message.error("Ошибка при загрузке настроек ОТ");
    } finally {
      setSettingsLoading(false);
    }
  }, [canManageSettings, selectedCategoryId]);

  useEffect(() => {
    if (!isStaff || !isAllowed) return;

    if (activeTab === "settings") {
      loadSettingsData();
    }
  }, [activeTab, isAllowed, isStaff, loadSettingsData]);

  const loadObjectStatuses = useCallback(async (constructionSiteId) => {
    if (!constructionSiteId) return;

    try {
      setObjectStatusLoading(true);
      const response = await otService.getContractorStatuses({
        constructionSiteId,
      });
      setObjectStatuses(response.data?.data || []);
    } catch (error) {
      console.error("Error loading OT contractor statuses:", error);
      message.error("Ошибка при загрузке статусов подрядчиков");
    } finally {
      setObjectStatusLoading(false);
    }
  }, []);

  const loadAllSiteSummaries = useCallback(async () => {
    if (!constructionSites.length) return;

    const requestId = (allSiteRequestRef.current += 1);
    const initialSummaries = constructionSites.map((site) => ({
      site,
      counts: null,
      loading: true,
      error: false,
    }));

    try {
      setAllSiteLoading(true);
      setAllSiteSummaries(initialSummaries);

      const siteIds = constructionSites.map((site) => site.id);
      const response = await otService.getContractorStatusSummary({
        constructionSiteIds: siteIds.join(","),
      });
      const summaries = response.data?.data || [];
      const summaryMap = new Map(
        summaries.map((item) => [item.constructionSiteId, item.counts]),
      );

      if (allSiteRequestRef.current !== requestId) return;

      setAllSiteSummaries(
        constructionSites.map((site) => ({
          site,
          counts: summaryMap.get(site.id) || {
            admitted: 0,
            not_admitted: 0,
            temp_admitted: 0,
          },
          loading: false,
          error: false,
        })),
      );
    } catch (error) {
      console.error("Error loading OT summaries:", error);
      message.error("Ошибка при загрузке сводки по объектам");
      if (allSiteRequestRef.current === requestId) {
        setAllSiteSummaries(
          constructionSites.map((site) => ({
            site,
            counts: null,
            loading: false,
            error: true,
          })),
        );
      }
    } finally {
      if (allSiteRequestRef.current === requestId) {
        setAllSiteLoading(false);
      }
    }
  }, [constructionSites]);

  useEffect(() => {
    if (!isStaff || !isAllowed) return;

    if (activeTab === "object" && selectedConstructionSiteId) {
      loadObjectStatuses(selectedConstructionSiteId);
    }

    if (activeTab === "all") {
      loadAllSiteSummaries();
    }
  }, [
    activeTab,
    isStaff,
    isAllowed,
    selectedConstructionSiteId,
    constructionSites,
    loadAllSiteSummaries,
    loadObjectStatuses,
  ]);

  const contractorTree = useMemo(() => {
    const buildTree = (categories) =>
      (categories || []).map((category) => {
        const childCategories = buildTree(category.children || []);
        const documents = (category.documents || []).map((doc) => ({
          key: `doc-${doc.id}`,
          type: "document",
          id: doc.id,
          name: doc.name,
          status: doc.status || "not_uploaded",
          isRequired: doc.isRequired,
          templateFileId: doc.templateFileId,
          contractorDocumentId: doc.contractorDocumentId,
          fileId: doc.fileId,
          comment: doc.comment,
          uploadedBy: doc.uploadedBy,
          checkedBy: doc.checkedBy,
          checkedAt: doc.checkedAt,
        }));

        return {
          key: `cat-${category.id}`,
          type: "category",
          id: category.id,
          name: category.name,
          description: category.description,
          children: [...childCategories, ...documents],
        };
      });

    return buildTree(contractorCategories);
  }, [contractorCategories]);

  const statusMeta = {
    not_uploaded: { text: "Не загружен", color: "red" },
    uploaded: { text: "Загружен", color: "orange" },
    approved: { text: "Подтвержден", color: "green" },
    rejected: { text: "Отклонен", color: "default" },
  };

  const contractorStatusMeta = {
    admitted: { text: "Допущен", color: "green" },
    not_admitted: { text: "Не допущен", color: "red" },
    temp_admitted: { text: "Временно допущен", color: "gold" },
  };

  const handleDownloadTemplate = async (doc) => {
    try {
      const response = await otService.downloadDocumentTemplate(doc.id);
      const url = response.data?.data?.url;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        message.error("Не удалось получить ссылку на шаблон");
      }
    } catch (error) {
      console.error("Error downloading OT template:", error);
      message.error("Ошибка при скачивании шаблона");
    }
  };

  const handleDownloadTemplateFile = async (template) => {
    try {
      const response = await otService.downloadTemplateFile(template.id);
      const url = response.data?.data?.url;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        message.error("Не удалось получить ссылку на файл");
      }
    } catch (error) {
      console.error("Error downloading OT template file:", error);
      message.error("Ошибка при скачивании шаблона");
    }
  };

  const handleDownloadInstructionFile = async (instruction) => {
    if (!instruction?.fileId) return;

    try {
      const response = await otService.downloadInstructionFile(instruction.id);
      const url = response.data?.data?.url;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        message.error("Не удалось получить ссылку на файл");
      }
    } catch (error) {
      console.error("Error downloading OT instruction file:", error);
      message.error("Ошибка при скачивании инструкции");
    }
  };

  const handleDownloadContractorFile = async (doc) => {
    if (!doc.contractorDocumentId) return;

    try {
      const response = await otService.downloadContractorDocFile(
        doc.contractorDocumentId,
      );
      const url = response.data?.data?.url;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        message.error("Не удалось получить ссылку на файл");
      }
    } catch (error) {
      console.error("Error downloading contractor file:", error);
      message.error("Ошибка при скачивании файла");
    }
  };

  const handleUploadClick = (doc) => {
    if (!selectedConstructionSiteId) {
      message.error("Выберите объект строительства");
      return;
    }

    if (isStaff && !selectedCounterpartyId) {
      message.error("Выберите подрядчика");
      return;
    }

    uploadTargetRef.current = doc;
    setUploadingDocId(doc.id);
    uploadInputRef.current?.click();
  };

  const handleTemplateUploadClick = (doc) => {
    templateUploadTargetRef.current = doc;
    setTemplateUploadingId(doc.id);
    templateInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const doc = uploadTargetRef.current;
    if (!doc) return;

    try {
      setContractorLoading(true);

      const payload = {
        documentId: doc.id,
        constructionSiteId: selectedConstructionSiteId,
      };

      if (isStaff) {
        payload.counterpartyId = selectedCounterpartyId;
      }

      await otService.uploadContractorDoc(file, payload);
      message.success("Документ загружен");

      await loadContractorDocs({
        constructionSiteId: selectedConstructionSiteId,
        counterpartyId: isStaff ? selectedCounterpartyId : user?.counterpartyId,
        isStaffMode: isStaff,
      });
    } catch (error) {
      console.error("Error uploading contractor doc:", error);
      message.error("Ошибка при загрузке документа");
    } finally {
      setUploadingDocId(null);
      setContractorLoading(false);
    }
  };

  const handleTemplateFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const doc = templateUploadTargetRef.current;
    if (!doc) return;

    try {
      await otService.uploadDocumentTemplate(doc.id, file);
      message.success("Бланк загружен");
      await loadSettingsData();
    } catch (error) {
      console.error("Error uploading OT template:", error);
      message.error("Ошибка при загрузке бланка");
    } finally {
      setTemplateUploadingId(null);
    }
  };

  const handleApprove = async (doc) => {
    if (!doc.contractorDocumentId) {
      message.error("Документ еще не загружен");
      return;
    }

    try {
      await otService.approveContractorDoc(doc.contractorDocumentId);
      message.success("Документ подтвержден");
      await loadContractorDocs({
        constructionSiteId: selectedConstructionSiteId,
        counterpartyId: selectedCounterpartyId,
        isStaffMode: true,
      });
    } catch (error) {
      console.error("Error approving contractor doc:", error);
      message.error("Ошибка при подтверждении");
    }
  };

  const handleReject = async (doc) => {
    if (!doc.contractorDocumentId) {
      message.error("Документ еще не загружен");
      return;
    }

    const comment = window.prompt("Укажите причину отклонения");
    if (!comment) return;

    try {
      await otService.rejectContractorDoc(doc.contractorDocumentId, comment);
      message.success("Документ отклонен");
      await loadContractorDocs({
        constructionSiteId: selectedConstructionSiteId,
        counterpartyId: selectedCounterpartyId,
        isStaffMode: true,
      });
    } catch (error) {
      console.error("Error rejecting contractor doc:", error);
      message.error("Ошибка при отклонении");
    }
  };

  const handleAddContractorComment = async () => {
    if (!contractorCommentText.trim()) return;

    const counterpartyId = isStaff
      ? selectedCounterpartyId
      : user?.counterpartyId;

    if (!counterpartyId || !selectedConstructionSiteId) {
      message.error("Выберите объект и подрядчика");
      return;
    }

    try {
      await otService.createComment({
        type: "contractor",
        counterpartyId,
        constructionSiteId: selectedConstructionSiteId,
        text: contractorCommentText.trim(),
      });
      setContractorCommentText("");
      await loadContractorComments({
        counterpartyId,
        constructionSiteId: selectedConstructionSiteId,
      });
      message.success("Комментарий добавлен");
    } catch (error) {
      console.error("Error creating OT contractor comment:", error);
      message.error("Ошибка при добавлении комментария");
    }
  };

  const handleOpenDocumentComments = async (doc) => {
    if (!doc?.contractorDocumentId) {
      message.error("Документ еще не загружен");
      return;
    }

    setDocumentCommentTarget(doc);
    setDocumentCommentModalOpen(true);
    setDocumentCommentText("");

    try {
      setDocumentCommentsLoading(true);
      const response = await otService.getComments({
        type: "document",
        contractorDocumentId: doc.contractorDocumentId,
      });
      setDocumentComments(response.data?.data || []);
    } catch (error) {
      console.error("Error loading OT document comments:", error);
      message.error("Ошибка при загрузке комментариев");
    } finally {
      setDocumentCommentsLoading(false);
    }
  };

  const handleAddDocumentComment = async () => {
    if (!documentCommentTarget?.contractorDocumentId) return;
    if (!documentCommentText.trim()) return;

    try {
      await otService.createComment({
        type: "document",
        contractorDocumentId: documentCommentTarget.contractorDocumentId,
        text: documentCommentText.trim(),
      });
      setDocumentCommentText("");
      const response = await otService.getComments({
        type: "document",
        contractorDocumentId: documentCommentTarget.contractorDocumentId,
      });
      setDocumentComments(response.data?.data || []);
      message.success("Комментарий добавлен");
    } catch (error) {
      console.error("Error creating OT document comment:", error);
      message.error("Ошибка при добавлении комментария");
    }
  };

  const handleOpenCategoryModal = useCallback(
    (category = null) => {
      setEditingCategory(category);
      categoryForm.resetFields();
      if (category) {
        categoryForm.setFieldsValue({
          name: category.name,
          description: category.description,
          parentId: category.parentId || null,
          sortOrder: category.sortOrder ?? 0,
        });
      }
      setCategoryModalOpen(true);
    },
    [categoryForm],
  );

  const handleCategorySubmit = async () => {
    try {
      const values = await categoryForm.validateFields();
      if (editingCategory) {
        await otService.updateCategory(editingCategory.id, values);
        message.success("Категория обновлена");
      } else {
        await otService.createCategory(values);
        message.success("Категория создана");
      }
      setCategoryModalOpen(false);
      setEditingCategory(null);
      await loadSettingsData();
    } catch (error) {
      if (error?.errorFields) return;
      console.error("Error saving OT category:", error);
      message.error("Ошибка при сохранении категории");
    }
  };

  const handleDeleteCategory = useCallback(
    (category) => {
      Modal.confirm({
        title: "Удалить категорию?",
        content: "Категория будет скрыта в списке. Документы сохранятся.",
        okText: "Удалить",
        okType: "danger",
        cancelText: "Отмена",
        onOk: async () => {
          try {
            await otService.deleteCategory(category.id);
            message.success("Категория удалена");
            await loadSettingsData();
          } catch (error) {
            console.error("Error deleting OT category:", error);
            message.error("Ошибка при удалении категории");
          }
        },
      });
    },
    [loadSettingsData],
  );

  const handleOpenDocumentModal = (document = null) => {
    setEditingDocument(document);
    documentForm.resetFields();
    if (document) {
      documentForm.setFieldsValue({
        name: document.name,
        description: document.description,
        isRequired: document.isRequired,
        categoryId: document.categoryId,
      });
    } else if (selectedCategoryId && selectedCategoryId !== "all") {
      documentForm.setFieldsValue({ categoryId: selectedCategoryId });
    }
    setDocumentModalOpen(true);
  };

  const handleDocumentSubmit = async () => {
    try {
      const values = await documentForm.validateFields();
      if (editingDocument) {
        await otService.updateDocument(editingDocument.id, values);
        message.success("Документ обновлен");
      } else {
        await otService.createDocument(values);
        message.success("Документ создан");
      }
      setDocumentModalOpen(false);
      setEditingDocument(null);
      await loadSettingsData();
    } catch (error) {
      if (error?.errorFields) return;
      console.error("Error saving OT document:", error);
      message.error("Ошибка при сохранении документа");
    }
  };

  const handleDeleteDocument = (document) => {
    Modal.confirm({
      title: "Удалить документ?",
      content: "Документ будет скрыт в списке.",
      okText: "Удалить",
      okType: "danger",
      cancelText: "Отмена",
      onOk: async () => {
        try {
          await otService.deleteDocument(document.id);
          message.success("Документ удален");
          await loadSettingsData();
        } catch (error) {
          console.error("Error deleting OT document:", error);
          message.error("Ошибка при удалении документа");
        }
      },
    });
  };

  const handleOpenTemplateModal = () => {
    templateForm.resetFields();
    setTemplateFileList([]);
    setTemplateModalOpen(true);
  };

  const handleTemplateSubmit = async () => {
    try {
      const values = await templateForm.validateFields();
      const file = templateFileList[0]?.originFileObj;
      if (!file) {
        message.error("Выберите файл");
        return;
      }
      await otService.createTemplate(file, values);
      message.success("Шаблон добавлен");
      setTemplateModalOpen(false);
      await loadSettingsData();
    } catch (error) {
      if (error?.errorFields) return;
      console.error("Error creating OT template:", error);
      message.error("Ошибка при добавлении шаблона");
    }
  };

  const handleDeleteTemplate = (template) => {
    Modal.confirm({
      title: "Удалить шаблон?",
      content: "Шаблон будет скрыт в списке.",
      okText: "Удалить",
      okType: "danger",
      cancelText: "Отмена",
      onOk: async () => {
        try {
          await otService.deleteTemplate(template.id);
          message.success("Шаблон удален");
          await loadSettingsData();
        } catch (error) {
          console.error("Error deleting OT template:", error);
          message.error("Ошибка при удалении шаблона");
        }
      },
    });
  };

  const handleOpenInstructionModal = () => {
    instructionForm.resetFields();
    setInstructionFileList([]);
    setInstructionModalOpen(true);
  };

  const handleInstructionSubmit = async () => {
    try {
      const values = await instructionForm.validateFields();
      const file = instructionFileList[0]?.originFileObj;
      await otService.createInstruction(file, values);
      message.success("Инструкция добавлена");
      setInstructionModalOpen(false);
      await loadSettingsData();
    } catch (error) {
      if (error?.errorFields) return;
      console.error("Error creating OT instruction:", error);
      message.error("Ошибка при добавлении инструкции");
    }
  };

  const handleOpenObject = (siteId) => {
    setSelectedConstructionSiteId(siteId);
    setActiveTab("object");
  };

  const handleOpenContractor = (counterpartyId) => {
    setSelectedCounterpartyId(counterpartyId);
    setActiveTab("contractor");
  };

  const handleTempAdmit = async (counterpartyId) => {
    if (!counterpartyId || !selectedConstructionSiteId) return;

    try {
      await otService.overrideContractorStatus(
        counterpartyId,
        selectedConstructionSiteId,
      );
      message.success("Временный допуск установлен");
      await loadObjectStatuses(selectedConstructionSiteId);
    } catch (error) {
      console.error("Error overriding OT status:", error);
      message.error("Ошибка при установке допуска");
    }
  };

  const handleRecalculateStatus = async (counterpartyId) => {
    if (!counterpartyId || !selectedConstructionSiteId) return;

    try {
      await otService.recalculateContractorStatus(
        counterpartyId,
        selectedConstructionSiteId,
      );
      message.success("Статус пересчитан");
      await loadObjectStatuses(selectedConstructionSiteId);
    } catch (error) {
      console.error("Error recalculating OT status:", error);
      message.error("Ошибка при пересчете статуса");
    }
  };

  const normalizedStats = useMemo(
    () => ({
      total: contractorStats.total || 0,
      uploaded: contractorStats.uploaded || 0,
      approved: contractorStats.approved || 0,
      rejected: contractorStats.rejected || 0,
      missing: contractorStats.missing || 0,
    }),
    [contractorStats],
  );

  const hasContractorSelection = isStaff
    ? Boolean(selectedConstructionSiteId && selectedCounterpartyId)
    : Boolean(selectedConstructionSiteId);

  const contractorCommentEnabled = useMemo(() => {
    const counterpartyId = isStaff
      ? selectedCounterpartyId
      : user?.counterpartyId;
    return Boolean(selectedConstructionSiteId && counterpartyId);
  }, [
    isStaff,
    selectedConstructionSiteId,
    selectedCounterpartyId,
    user?.counterpartyId,
  ]);

  const constructionSiteOptions = useMemo(
    () =>
      constructionSites.map((site) => ({
        label: site.shortName || site.fullName || site.id,
        value: site.id,
      })),
    [constructionSites],
  );

  const counterpartyOptions = useMemo(
    () =>
      counterparties.map((counterparty) => ({
        label: counterparty.name || counterparty.id,
        value: counterparty.id,
      })),
    [counterparties],
  );

  const categoryOptions = useMemo(() => {
    const buildOptions = (nodes, depth = 0) =>
      nodes.flatMap((node) => {
        const label = `${"— ".repeat(depth)}${node.name}`;
        return [
          { label, value: node.id },
          ...buildOptions(node.children || [], depth + 1),
        ];
      });

    return buildOptions(settingsCategories || []);
  }, [settingsCategories]);

  const filteredDocuments = useMemo(() => {
    if (!selectedCategoryId || selectedCategoryId === "all")
      return settingsDocuments;
    return settingsDocuments.filter(
      (doc) => doc.categoryId === selectedCategoryId,
    );
  }, [settingsDocuments, selectedCategoryId]);

  const settingsCategoryTree = useMemo(() => {
    const buildTree = (nodes) =>
      (nodes || []).map((node) => ({
        key: node.id,
        title: (
          <Space
            size={8}
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <Text strong>{node.name}</Text>
            <Space size={4}>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleOpenCategoryModal(node)}
              >
                Редактировать
              </Button>
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteCategory(node)}
              >
                Удалить
              </Button>
            </Space>
          </Space>
        ),
        children: buildTree(node.children || []),
      }));

    return buildTree(settingsCategories);
  }, [settingsCategories, handleDeleteCategory, handleOpenCategoryModal]);

  const objectStatusSummary = useMemo(() => {
    return objectStatuses.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      { admitted: 0, not_admitted: 0, temp_admitted: 0 },
    );
  }, [objectStatuses]);

  const latestInstruction = useMemo(() => {
    if (!settingsInstructions.length) return null;
    return [...settingsInstructions].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    )[0];
  }, [settingsInstructions]);

  const renderTreeTitle = (node) => {
    if (node.type === "category") {
      return (
        <Space
          size={8}
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <Text strong>{node.name}</Text>
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
          {node.isRequired && <Tag color="red">Обязательный</Tag>}
        </Space>
        <Space size={6} wrap>
          {node.templateFileId && (
            <Tooltip title="Скачать бланк">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadTemplate(node)}
              />
            </Tooltip>
          )}
          {node.fileId && (
            <Tooltip title="Скачать файл">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadContractorFile(node)}
              />
            </Tooltip>
          )}
          <Tooltip title="Комментарии">
            <Button
              size="small"
              icon={<MessageOutlined />}
              disabled={!node.contractorDocumentId}
              onClick={() => handleOpenDocumentComments(node)}
            />
          </Tooltip>
          <Tag color={meta.color}>{meta.text}</Tag>
          {(isContractorUser || isStaff) && (
            <Button
              size="small"
              icon={<UploadOutlined />}
              loading={uploadingDocId === node.id}
              onClick={() => handleUploadClick(node)}
            >
              Загрузить
            </Button>
          )}
          {isStaff && (
            <Space size={4}>
              <Button
                size="small"
                icon={<CheckOutlined />}
                type="primary"
                onClick={() => handleApprove(node)}
              >
                Подтвердить
              </Button>
              <Button
                size="small"
                icon={<CloseOutlined />}
                danger
                onClick={() => handleReject(node)}
              >
                Отклонить
              </Button>
            </Space>
          )}
        </Space>
      </Space>
    );
  };

  const tabs = (() => {
    const items = [];

    if (isStaff) {
      items.push(
        {
          key: "all",
          label: t("ot.tabs.all"),
          children: (
            <Card size="small">
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Title level={5} style={{ margin: 0 }}>
                  Сводка по объектам
                </Title>
                <Text type="secondary">
                  Количество допущенных, не допущенных и временно допущенных
                  подрядчиков по каждому объекту.
                </Text>
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  {allSiteSummaries.length === 0 && allSiteLoading && (
                    <Card size="small" styles={{ body: { padding: 12 } }}>
                      <Text type="secondary">Загрузка...</Text>
                    </Card>
                  )}
                  {allSiteSummaries.length === 0 && !allSiteLoading && (
                    <Empty description="Нет данных по объектам" />
                  )}
                  {allSiteSummaries.length > 0 &&
                    allSiteSummaries.map(({ site, counts, loading, error }) => (
                      <Card
                        size="small"
                        key={site.id}
                        styles={{ body: { padding: 8 } }}
                      >
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
                            <Text strong>
                              {site.shortName || site.fullName || site.id}
                            </Text>
                            <Button
                              size="small"
                              onClick={() => handleOpenObject(site.id)}
                            >
                              Открыть
                            </Button>
                          </Space>
                          <Space wrap>
                            {counts ? (
                              <>
                                <Tag color="green">
                                  Допущены: {counts.admitted}
                                </Tag>
                                <Tag color="red">
                                  Не допущены: {counts.not_admitted}
                                </Tag>
                                <Tag color="gold">
                                  Временно: {counts.temp_admitted}
                                </Tag>
                              </>
                            ) : loading ? (
                              <Tag color="default">Загрузка...</Tag>
                            ) : null}
                            {error && <Tag color="red">Ошибка загрузки</Tag>}
                          </Space>
                        </Space>
                      </Card>
                    ))}
                </Space>
              </Space>
            </Card>
          ),
        },
        {
          key: "object",
          label: t("ot.tabs.object"),
          children: (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Card size="small">
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Text>Выберите объект</Text>
                  <Select
                    placeholder="Объект строительства"
                    size="large"
                    options={constructionSiteOptions}
                    value={selectedConstructionSiteId}
                    onChange={(value) => setSelectedConstructionSiteId(value)}
                    style={selectCollapsedStyle}
                    dropdownMatchSelectWidth={false}
                    dropdownStyle={selectDropdownStyle}
                  />
                </Space>
              </Card>
              <Card size="small">
                <Row gutter={[12, 12]}>
                  <Col xs={12} sm={8}>
                    <Statistic
                      title="Допущены"
                      value={objectStatusSummary.admitted}
                    />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic
                      title="Не допущены"
                      value={objectStatusSummary.not_admitted}
                    />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic
                      title="Временно допущены"
                      value={objectStatusSummary.temp_admitted}
                    />
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
                    {objectStatusLoading && (
                      <Card size="small" styles={{ body: { padding: 8 } }}>
                        <Text type="secondary">Загрузка...</Text>
                      </Card>
                    )}
                    {!objectStatusLoading && objectStatuses.length === 0 && (
                      <Empty description="Нет подрядчиков на объекте" />
                    )}
                    {!objectStatusLoading &&
                      objectStatuses.map((item) => {
                        const meta =
                          contractorStatusMeta[item.status] ||
                          contractorStatusMeta.not_admitted;
                        const totalRequired = item.totalRequired || 0;
                        const approvedRequired = item.approvedRequired || 0;
                        const missingRequired = item.missingRequired || 0;
                        return (
                          <Card
                            size="small"
                            key={item.counterparty?.id || item.status}
                            styles={{ body: { padding: 8 } }}
                          >
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
                                <Text strong>
                                  {item.counterparty?.name ||
                                    item.counterparty?.id}
                                </Text>
                                <Tag color={meta.color}>{meta.text}</Tag>
                              </Space>
                              <Space wrap>
                                {totalRequired > 0 ? (
                                  <Tag color="blue">
                                    Обязательные: {approvedRequired}/
                                    {totalRequired}
                                  </Tag>
                                ) : (
                                  <Tag color="default">
                                    Нет обязательных документов
                                  </Tag>
                                )}
                                {missingRequired > 0 && (
                                  <Tag color="red">
                                    Не хватает: {missingRequired}
                                  </Tag>
                                )}
                                {item.isManual && (
                                  <Tag color="gold">Ручной статус</Tag>
                                )}
                              </Space>
                              {isStaff && (
                                <Space size={8} wrap>
                                  <Button
                                    size="small"
                                    onClick={() =>
                                      handleTempAdmit(item.counterparty?.id)
                                    }
                                    disabled={!item.counterparty?.id}
                                  >
                                    Временно допустить
                                  </Button>
                                  <Button
                                    size="small"
                                    onClick={() =>
                                      handleRecalculateStatus(
                                        item.counterparty?.id,
                                      )
                                    }
                                    disabled={!item.counterparty?.id}
                                  >
                                    Пересчитать
                                  </Button>
                                </Space>
                              )}
                              <Button
                                size="small"
                                onClick={() =>
                                  handleOpenContractor(item.counterparty?.id)
                                }
                              >
                                Открыть подрядчика
                              </Button>
                            </Space>
                          </Card>
                        );
                      })}
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
      label: t("ot.tabs.contractor"),
      children: (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <input
            ref={uploadInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <input
            ref={templateInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={handleTemplateFileChange}
          />
          {!isStaff && (
            <Card size="small">
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Text>Объект строительства</Text>
                <Select
                  placeholder="Объект"
                  size="large"
                  options={constructionSiteOptions}
                  value={selectedConstructionSiteId}
                  onChange={(value) => setSelectedConstructionSiteId(value)}
                  style={selectCollapsedStyle}
                  dropdownMatchSelectWidth={false}
                  dropdownStyle={selectDropdownStyle}
                />
              </Space>
            </Card>
          )}
          {isStaff && (
            <Card size="small">
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Text>Фильтры</Text>
                <Space
                  direction="horizontal"
                  size={8}
                  style={{ width: "100%" }}
                >
                  <Select
                    placeholder="Объект"
                    size="large"
                    options={constructionSiteOptions}
                    value={selectedConstructionSiteId}
                    onChange={(value) => setSelectedConstructionSiteId(value)}
                    style={selectCollapsedStyle}
                    dropdownMatchSelectWidth={false}
                    dropdownStyle={selectDropdownStyle}
                  />
                  <Select
                    placeholder="Подрядчик"
                    size="large"
                    options={counterpartyOptions}
                    value={selectedCounterpartyId}
                    onChange={(value) => setSelectedCounterpartyId(value)}
                    style={selectCollapsedStyle}
                    dropdownMatchSelectWidth={false}
                    dropdownStyle={selectDropdownStyle}
                  />
                </Space>
              </Space>
            </Card>
          )}
          {hasContractorSelection && (
            <>
              <Card size="small" loading={contractorLoading}>
                <Row gutter={[12, 12]}>
                  <Col xs={12} sm={8}>
                    <Statistic
                      title="Всего документов"
                      value={normalizedStats.total}
                    />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic
                      title="Загружены"
                      value={normalizedStats.uploaded}
                    />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic
                      title="Подтверждены"
                      value={normalizedStats.approved}
                    />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic
                      title="Отклонены"
                      value={normalizedStats.rejected}
                    />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic
                      title="Не загружены"
                      value={normalizedStats.missing}
                    />
                  </Col>
                </Row>
              </Card>
              <Card size="small">
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Title level={5} style={{ margin: 0 }}>
                    Комментарии по подрядчику
                  </Title>
                  <List
                    loading={contractorCommentsLoading}
                    dataSource={contractorComments}
                    locale={{ emptyText: "Комментариев пока нет" }}
                    renderItem={(item) => {
                      const creatorName = [
                        item.creator?.lastName,
                        item.creator?.firstName,
                      ]
                        .filter(Boolean)
                        .join(" ");
                      const title = creatorName
                        ? `${creatorName} • ${dayjs(item.createdAt).format(
                            "DD.MM.YYYY HH:mm",
                          )}`
                        : dayjs(item.createdAt).format("DD.MM.YYYY HH:mm");

                      return (
                        <List.Item>
                          <List.Item.Meta
                            title={title}
                            description={item.text}
                          />
                        </List.Item>
                      );
                    }}
                  />
                  <Input.TextArea
                    rows={3}
                    placeholder="Добавить комментарий"
                    value={contractorCommentText}
                    onChange={(event) =>
                      setContractorCommentText(event.target.value)
                    }
                    disabled={!contractorCommentEnabled}
                  />
                  <Button
                    type="primary"
                    onClick={handleAddContractorComment}
                    disabled={
                      !contractorCommentEnabled || !contractorCommentText.trim()
                    }
                  >
                    Добавить комментарий
                  </Button>
                </Space>
              </Card>
              <Card size="small">
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  <Title level={5} style={{ margin: 0 }}>
                    Документы подрядчика
                  </Title>
                  <Tree
                    blockNode
                    showLine
                    defaultExpandAll
                    treeData={(contractorTree || []).map((node) => {
                      const mapNode = (item) => ({
                        key: item.key,
                        title: renderTreeTitle(item),
                        children: item.children?.map(mapNode),
                      });
                      return mapNode(node);
                    })}
                  />
                </Space>
              </Card>
            </>
          )}
        </Space>
      ),
    });

    if (canManageSettings) {
      items.push({
        key: "settings",
        label: t("ot.tabs.settings"),
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
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleOpenCategoryModal()}
                  >
                    Добавить категорию
                  </Button>
                </Space>
                {settingsLoading ? (
                  <Text type="secondary">Загрузка...</Text>
                ) : settingsCategoryTree.length === 0 ? (
                  <Empty description="Категории не созданы" />
                ) : (
                  <Tree
                    blockNode
                    showLine
                    defaultExpandAll
                    treeData={settingsCategoryTree}
                  />
                )}
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
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleOpenDocumentModal()}
                  >
                    Добавить документ
                  </Button>
                </Space>
                <Select
                  placeholder="Категория"
                  options={[
                    { label: "Все категории", value: "all" },
                    ...categoryOptions,
                  ]}
                  value={selectedCategoryId}
                  onChange={(value) => setSelectedCategoryId(value)}
                  style={{ width: selectMinWidth, maxWidth: 320 }}
                  dropdownMatchSelectWidth={false}
                  dropdownStyle={selectDropdownStyle}
                  allowClear
                />
                <List
                  dataSource={filteredDocuments}
                  locale={{ emptyText: "Документы не найдены" }}
                  renderItem={(doc) => (
                    <List.Item
                      actions={[
                        <Tooltip title="Скачать бланк" key="download">
                          <Button
                            size="small"
                            icon={<DownloadOutlined />}
                            disabled={!doc.templateFileId}
                            onClick={() => handleDownloadTemplate(doc)}
                          />
                        </Tooltip>,
                        <Tooltip title="Загрузить бланк" key="upload">
                          <Button
                            size="small"
                            icon={<UploadOutlined />}
                            loading={templateUploadingId === doc.id}
                            onClick={() => handleTemplateUploadClick(doc)}
                          />
                        </Tooltip>,
                        <Tooltip title="Редактировать" key="edit">
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleOpenDocumentModal(doc)}
                          />
                        </Tooltip>,
                        <Tooltip title="Удалить" key="delete">
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDeleteDocument(doc)}
                          />
                        </Tooltip>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space>
                            <Text strong>{doc.name}</Text>
                            <Tag color={doc.isRequired ? "red" : "default"}>
                              {doc.isRequired
                                ? "Обязательный"
                                : "Необязательный"}
                            </Tag>
                          </Space>
                        }
                        description={doc.description || "—"}
                      />
                    </List.Item>
                  )}
                />
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
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleOpenTemplateModal}
                  >
                    Добавить шаблон
                  </Button>
                </Space>
                <List
                  dataSource={settingsTemplates}
                  locale={{ emptyText: "Шаблоны не найдены" }}
                  renderItem={(item) => (
                    <List.Item
                      actions={[
                        <Tooltip title="Скачать" key="download">
                          <Button
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownloadTemplateFile(item)}
                          />
                        </Tooltip>,
                        <Tooltip title="Удалить" key="delete">
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDeleteTemplate(item)}
                          />
                        </Tooltip>,
                      ]}
                    >
                      <List.Item.Meta
                        title={<Text strong>{item.name}</Text>}
                        description={item.description || "—"}
                      />
                    </List.Item>
                  )}
                />
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
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleOpenInstructionModal}
                  >
                    Редактировать
                  </Button>
                </Space>
                {latestInstruction ? (
                  <>
                    <Text type="secondary">
                      {latestInstruction.text || "Инструкция без текста"}
                    </Text>
                    <Space wrap>
                      <Button
                        size="small"
                        icon={<DownloadOutlined />}
                        disabled={!latestInstruction.fileId}
                        onClick={() =>
                          handleDownloadInstructionFile(latestInstruction)
                        }
                      >
                        Скачать инструкцию
                      </Button>
                    </Space>
                    <Divider style={{ margin: "12px 0" }} />
                    <List
                      size="small"
                      dataSource={settingsInstructions}
                      locale={{ emptyText: "Инструкции не найдены" }}
                      renderItem={(item) => (
                        <List.Item
                          actions={[
                            item.fileId ? (
                              <Button
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={() =>
                                  handleDownloadInstructionFile(item)
                                }
                              >
                                Скачать
                              </Button>
                            ) : null,
                          ]}
                        >
                          <List.Item.Meta
                            title={dayjs(item.createdAt).format(
                              "DD.MM.YYYY HH:mm",
                            )}
                            description={item.text || "Без текста"}
                          />
                        </List.Item>
                      )}
                    />
                  </>
                ) : (
                  <Empty description="Инструкции не добавлены" />
                )}
              </Space>
            </Card>
          </Space>
        ),
      });
    }

    return items;
  })();

  if (!isAllowed) {
    return (
      <Result
        status="403"
        title={t("common.accessDenied")}
        subTitle={t("ot.accessDenied")}
      />
    );
  }

  if (isDefaultCounterpartyUser) {
    return (
      <Result
        status="403"
        title={t("common.accessDenied")}
        subTitle={t("ot.defaultCounterpartyDenied")}
      />
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Title level={3} style={{ margin: 0 }}>
          {t("ot.title")}
        </Title>
        <Tabs items={tabs} activeKey={activeTab} onChange={setActiveTab} />
      </Space>
      <Modal
        open={categoryModalOpen}
        title={editingCategory ? "Редактировать категорию" : "Новая категория"}
        onCancel={() => setCategoryModalOpen(false)}
        onOk={handleCategorySubmit}
        okText={editingCategory ? "Сохранить" : "Создать"}
        cancelText="Отмена"
      >
        <Form form={categoryForm} layout="vertical">
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: "Укажите название" }]}
          >
            <Input placeholder="Название категории" />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} placeholder="Описание" />
          </Form.Item>
          <Form.Item name="parentId" label="Родительская категория">
            <Select
              allowClear
              options={categoryOptions.filter(
                (option) => option.value !== editingCategory?.id,
              )}
              style={selectFullStyle}
              dropdownMatchSelectWidth={false}
              dropdownStyle={selectDropdownStyle}
            />
          </Form.Item>
          <Form.Item name="sortOrder" label="Порядок">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={documentModalOpen}
        title={editingDocument ? "Редактировать документ" : "Новый документ"}
        onCancel={() => setDocumentModalOpen(false)}
        onOk={handleDocumentSubmit}
        okText={editingDocument ? "Сохранить" : "Создать"}
        cancelText="Отмена"
      >
        <Form form={documentForm} layout="vertical">
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: "Укажите название" }]}
          >
            <Input placeholder="Название документа" />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} placeholder="Описание" />
          </Form.Item>
          <Form.Item
            name="categoryId"
            label="Категория"
            rules={[{ required: true, message: "Выберите категорию" }]}
          >
            <Select
              options={categoryOptions}
              style={selectFullStyle}
              dropdownMatchSelectWidth={false}
              dropdownStyle={selectDropdownStyle}
            />
          </Form.Item>
          <Form.Item
            name="isRequired"
            label="Обязательный"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={templateModalOpen}
        title="Новый шаблон"
        onCancel={() => setTemplateModalOpen(false)}
        onOk={handleTemplateSubmit}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form form={templateForm} layout="vertical">
          <Form.Item name="name" label="Название">
            <Input placeholder="Название шаблона" />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} placeholder="Описание" />
          </Form.Item>
          <Form.Item
            label="Файл"
            required
            validateStatus={templateFileList.length === 0 ? "error" : ""}
            help={templateFileList.length === 0 ? "Выберите файл" : ""}
          >
            <Upload
              fileList={templateFileList}
              beforeUpload={() => false}
              onChange={({ fileList }) =>
                setTemplateFileList(fileList.slice(-1))
              }
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Выбрать файл</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={instructionModalOpen}
        title="Новая инструкция"
        onCancel={() => setInstructionModalOpen(false)}
        onOk={handleInstructionSubmit}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form form={instructionForm} layout="vertical">
          <Form.Item name="text" label="Текст">
            <Input.TextArea rows={4} placeholder="Текст инструкции" />
          </Form.Item>
          <Form.Item label="Файл (опционально)">
            <Upload
              fileList={instructionFileList}
              beforeUpload={() => false}
              onChange={({ fileList }) =>
                setInstructionFileList(fileList.slice(-1))
              }
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Выбрать файл</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={documentCommentModalOpen}
        title={
          documentCommentTarget
            ? `Комментарии: ${documentCommentTarget.name}`
            : "Комментарии к документу"
        }
        onCancel={() => {
          setDocumentCommentModalOpen(false);
          setDocumentCommentTarget(null);
          setDocumentComments([]);
          setDocumentCommentText("");
        }}
        footer={null}
      >
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <List
            loading={documentCommentsLoading}
            dataSource={documentComments}
            locale={{ emptyText: "Комментариев пока нет" }}
            renderItem={(item) => {
              const creatorName = [
                item.creator?.lastName,
                item.creator?.firstName,
              ]
                .filter(Boolean)
                .join(" ");
              const title = creatorName
                ? `${creatorName} • ${dayjs(item.createdAt).format(
                    "DD.MM.YYYY HH:mm",
                  )}`
                : dayjs(item.createdAt).format("DD.MM.YYYY HH:mm");

              return (
                <List.Item>
                  <List.Item.Meta title={title} description={item.text} />
                </List.Item>
              );
            }}
          />
          <Input.TextArea
            rows={3}
            placeholder="Добавить комментарий"
            value={documentCommentText}
            onChange={(event) => setDocumentCommentText(event.target.value)}
          />
          <Button
            type="primary"
            onClick={handleAddDocumentComment}
            disabled={!documentCommentText.trim()}
          >
            Добавить комментарий
          </Button>
        </Space>
      </Modal>
    </div>
  );
};

export default OccupationalSafetyPage;
