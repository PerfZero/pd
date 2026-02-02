import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  message,
  Modal,
  Form,
  Grid,
  Space,
  Typography,
  Tag,
  Button,
  Tooltip,
  Input,
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
  EditOutlined,
  DeleteOutlined,
  MessageOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

const { useBreakpoint } = Grid;
const { Text } = Typography;

const useOccupationalSafety = () => {
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
  const [contractorCommentEditOpen, setContractorCommentEditOpen] =
    useState(false);
  const [editingContractorComment, setEditingContractorComment] =
    useState(null);
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
  const [contractorCommentForm] = Form.useForm();
  const [templateForm] = Form.useForm();
  const [instructionForm] = Form.useForm();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { t } = useTranslation();
  const selectMinWidth = 300;
  const selectMaxWidth = 500;
  const selectCollapsedStyle = { width: selectMinWidth };
  const contractorSelectStyle = { width: 250 };
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

  const counterpartyId = useMemo(() => {
    if (isStaff) {
      return selectedCounterpartyId || null;
    }
    return user?.counterpartyId || null;
  }, [isStaff, selectedCounterpartyId, user?.counterpartyId]);

  const constructionSiteId = useMemo(() => {
    if (isStaff) {
      return selectedConstructionSiteId || null;
    }
    return selectedConstructionSiteId || null;
  }, [isStaff, selectedConstructionSiteId]);

  const isStaffMode = isStaff;

  useEffect(() => {
    if (!constructionSiteId || !counterpartyId) return;

    loadContractorDocs({
      constructionSiteId,
      counterpartyId,
      isStaffMode,
    });
    loadContractorComments({ constructionSiteId, counterpartyId });
  }, [constructionSiteId, counterpartyId, isStaffMode]);

  const loadSettingsData = async () => {
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
    } catch (error) {
      console.error("Error loading OT settings:", error);
      message.error("Ошибка при загрузке настроек");
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadInstructionsOnly = async () => {
    try {
      const instructionsRes = await otService.getInstructions();
      setSettingsInstructions(instructionsRes.data?.data || []);
    } catch (error) {
      console.error("Error loading OT instructions:", error);
      message.error("Ошибка при загрузке инструкций");
    }
  };

  useEffect(() => {
    if (!isAllowed) return;
    if (canManageSettings) {
      loadSettingsData();
      return;
    }
    loadInstructionsOnly();
  }, [isAllowed, canManageSettings]);

  const loadObjectStatuses = async (constructionSiteIdValue) => {
    if (!constructionSiteIdValue) return;

    try {
      setObjectStatusLoading(true);
      const response = await otService.getContractorStatuses({
        constructionSiteId: constructionSiteIdValue,
      });
      setObjectStatuses(response.data?.data || []);
    } catch (error) {
      console.error("Error loading OT contractor statuses:", error);
      message.error("Ошибка при загрузке статусов подрядчиков");
    } finally {
      setObjectStatusLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedConstructionSiteId) return;
    if (!isStaff) return;
    loadObjectStatuses(selectedConstructionSiteId);
  }, [selectedConstructionSiteId, isStaff]);

  const loadAllSiteSummaries = async () => {
    if (!isStaff) return;

    const requestId = allSiteRequestRef.current + 1;
    allSiteRequestRef.current = requestId;

    const initialSummaries = (constructionSites || []).map((site) => ({
      site,
      counts: null,
      loading: true,
      error: false,
    }));

    setAllSiteSummaries(initialSummaries);
    setAllSiteLoading(true);

    try {
      const siteIds = (constructionSites || []).map((site) => site.id);
      if (!siteIds.length) {
        setAllSiteSummaries([]);
        return;
      }

      const response = await otService.getContractorStatusSummary({
        constructionSiteIds: siteIds.join(","),
      });
      const summaries = response.data?.data || [];

      if (allSiteRequestRef.current !== requestId) return;

      const summaryMap = new Map(
        summaries.map((summary) => [summary.constructionSiteId, summary]),
      );

      setAllSiteSummaries(
        (constructionSites || []).map((site) => {
          const summary = summaryMap.get(site.id);
          if (!summary) {
            return { site, counts: null, loading: false, error: true };
          }

          const counts = {
            admitted: summary.admittedCount || 0,
            not_admitted: summary.notAdmittedCount || 0,
            temp_admitted: summary.tempAdmittedCount || 0,
          };

          return { site, counts, loading: false, error: false };
        }),
      );
    } catch (error) {
      console.error("Error loading OT site summaries:", error);
      setAllSiteSummaries(
        (constructionSites || []).map((site) => ({
          site,
          counts: null,
          loading: false,
          error: true,
        })),
      );
    } finally {
      if (allSiteRequestRef.current === requestId) {
        setAllSiteLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isStaff) return;
    if (!constructionSites.length) return;
    loadAllSiteSummaries();
  }, [isStaff, constructionSites]);

  const contractorTree = useMemo(() => {
    if (!contractorCategories.length) return [];

    const buildTree = (categories) =>
      categories.map((category) => {
        const childCategories = category.children || [];
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
          children: [...documents, ...buildTree(childCategories)],
        };
      });

    return buildTree(contractorCategories || []);
  }, [contractorCategories]);

  const statusMeta = {
    not_uploaded: { text: "Не загружен", color: "default" },
    uploaded: { text: "Загружен", color: "blue" },
    approved: { text: "Подтвержден", color: "green" },
    rejected: { text: "Отклонен", color: "red" },
  };

  const contractorStatusMeta = {
    admitted: { text: "Допущен", color: "green" },
    not_admitted: { text: "Не допущен", color: "red" },
    temp_admitted: { text: "Временный допуск", color: "gold" },
  };

  const handleDownloadTemplate = async (doc) => {
    try {
      const response = await otService.downloadDocumentTemplate(doc.id);
      const url = response.data?.data?.url;
      if (url) {
        window.open(url, "_blank");
      }
    } catch (error) {
      console.error("Error downloading OT template:", error);
      message.error("Ошибка при скачивании шаблона");
    }
  };

  const handleDownloadTemplateFile = async (template) => {
    try {
      const response = await otService.downloadTemplateFile(template.fileId);
      const url = response.data?.data?.url;
      if (url) {
        window.open(url, "_blank");
      }
    } catch (error) {
      console.error("Error downloading OT template:", error);
      message.error("Ошибка при скачивании шаблона");
    }
  };

  const handleDownloadInstructionFile = async (instruction) => {
    try {
      const response = await otService.downloadInstructionFile(
        instruction.fileId,
      );
      const url = response.data?.data?.url;
      if (url) {
        window.open(url, "_blank");
      }
    } catch (error) {
      console.error("Error downloading OT instruction:", error);
      message.error("Ошибка при скачивании инструкции");
    }
  };

  const handleDownloadContractorFile = async (doc) => {
    try {
      const response = await otService.downloadContractorDocFile(doc.fileId);
      const url = response.data?.data?.url;
      if (url) {
        window.open(url, "_blank");
      }
    } catch (error) {
      console.error("Error downloading OT contractor file:", error);
      message.error("Ошибка при скачивании файла");
    }
  };

  const handleUploadClick = (doc) => {
    uploadTargetRef.current = doc;
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
      uploadInputRef.current.click();
    }
  };

  const handleTemplateUploadClick = (doc) => {
    templateUploadTargetRef.current = doc;
    if (templateInputRef.current) {
      templateInputRef.current.value = "";
      templateInputRef.current.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const doc = uploadTargetRef.current;
    if (!doc) return;

    try {
      setUploadingDocId(doc.id);
      const payload = {
        documentId: doc.id,
        constructionSiteId: selectedConstructionSiteId,
      };

      await otService.uploadContractorDoc(file, payload);
      message.success("Документ загружен");
      const constructionSiteIdValue = selectedConstructionSiteId;
      const counterpartyIdValue = counterpartyId;
      const isStaffModeValue = isStaffMode;
      await loadContractorDocs({
        constructionSiteId: constructionSiteIdValue,
        counterpartyId: counterpartyIdValue,
        isStaffMode: isStaffModeValue,
      });
    } catch (error) {
      console.error("Error uploading OT contractor file:", error);
      message.error("Ошибка при загрузке документа");
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleTemplateFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const doc = templateUploadTargetRef.current;
    if (!doc) return;

    try {
      setTemplateUploadingId(doc.id);
      await otService.uploadDocumentTemplate(doc.id, file);
      message.success("Шаблон загружен");
      await loadSettingsData();
    } catch (error) {
      console.error("Error uploading OT template file:", error);
      message.error("Ошибка при загрузке шаблона");
    } finally {
      setTemplateUploadingId(null);
    }
  };

  const handleApprove = async (doc) => {
    if (!doc?.contractorDocumentId) return;

    try {
      await otService.approveContractorDoc(doc.contractorDocumentId);
      message.success("Документ подтвержден");
      await loadContractorDocs({
        constructionSiteId: selectedConstructionSiteId,
        counterpartyId,
        isStaffMode,
      });
    } catch (error) {
      console.error("Error approving OT contractor doc:", error);
      message.error("Ошибка при подтверждении документа");
    }
  };

  const handleReject = async (doc) => {
    if (!doc?.contractorDocumentId) return;

    const comment = await Modal.confirm({
      title: "Отклонить документ?",
      content: (
        <Form form={documentForm} layout="vertical">
          <Form.Item
            name="comment"
            label="Комментарий"
            rules={[{ required: true, message: "Укажите причину" }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      ),
      okText: "Отклонить",
      okType: "danger",
      cancelText: "Отмена",
      onOk: async () => {
        try {
          const values = await documentForm.validateFields();
          return values.comment;
        } catch (error) {
          return Promise.reject(error);
        }
      },
    });

    try {
      await otService.rejectContractorDoc(doc.contractorDocumentId, comment);
      message.success("Документ отклонен");
      await loadContractorDocs({
        constructionSiteId: selectedConstructionSiteId,
        counterpartyId,
        isStaffMode,
      });
    } catch (error) {
      console.error("Error rejecting OT contractor doc:", error);
      message.error("Ошибка при отклонении документа");
    }
  };

  const handleAddContractorComment = async () => {
    if (!counterpartyId || !selectedConstructionSiteId) return;
    if (!contractorCommentText.trim()) return;

    try {
      await otService.createComment({
        type: "contractor",
        counterpartyId,
        constructionSiteId: selectedConstructionSiteId,
        text: contractorCommentText.trim(),
      });
      setContractorCommentText("");
      await loadContractorComments({
        constructionSiteId: selectedConstructionSiteId,
        counterpartyId,
      });
      message.success("Комментарий добавлен");
    } catch (error) {
      console.error("Error creating OT contractor comment:", error);
      message.error("Ошибка при добавлении комментария");
    }
  };

  const handleOpenEditContractorComment = (comment) => {
    setEditingContractorComment(comment);
    contractorCommentForm.resetFields();
    contractorCommentForm.setFieldsValue({ text: comment?.text || "" });
    setContractorCommentEditOpen(true);
  };

  const handleUpdateContractorComment = async () => {
    if (!editingContractorComment) return;

    try {
      const values = await contractorCommentForm.validateFields();
      const text = values.text?.trim();
      if (!text) {
        message.error("Введите комментарий");
        return;
      }
      await otService.updateComment(editingContractorComment.id, {
        text,
      });
      message.success("Комментарий обновлен");
      setContractorCommentEditOpen(false);
      setEditingContractorComment(null);
      await loadContractorComments({
        constructionSiteId: selectedConstructionSiteId,
        counterpartyId,
      });
    } catch (error) {
      if (error?.errorFields) return;
      console.error("Error updating OT contractor comment:", error);
      message.error("Ошибка при обновлении комментария");
    }
  };

  const handleDeleteContractorComment = (comment) => {
    Modal.confirm({
      title: "Удалить комментарий?",
      content: "Комментарий будет удален без возможности восстановления.",
      okText: "Удалить",
      okType: "danger",
      cancelText: "Отмена",
      onOk: async () => {
        try {
          await otService.deleteComment(comment.id);
          message.success("Комментарий удален");
          await loadContractorComments({
            constructionSiteId: selectedConstructionSiteId,
            counterpartyId,
          });
        } catch (error) {
          console.error("Error deleting OT contractor comment:", error);
          message.error("Ошибка при удалении комментария");
        }
      },
    });
  };

  const handleCloseContractorCommentEdit = useCallback(() => {
    setContractorCommentEditOpen(false);
    setEditingContractorComment(null);
  }, []);

  const handleOpenDocumentComments = async (doc) => {
    if (!doc?.contractorDocumentId) return;

    try {
      setDocumentCommentsLoading(true);
      setDocumentCommentTarget({
        type: "document",
        contractorDocumentId: doc.contractorDocumentId,
        name: doc.name,
      });
      setDocumentCommentModalOpen(true);
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

  const handleDeleteCategory = useCallback((category) => {
    Modal.confirm({
      title: "Удалить категорию?",
      content:
        "Категория будет скрыта, документы и подкатегории останутся в базе.",
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
  }, []);

  const handleOpenDocumentModal = (doc = null) => {
    setEditingDocument(doc);
    documentForm.resetFields();
    if (doc) {
      documentForm.setFieldsValue({
        name: doc.name,
        description: doc.description,
        isRequired: doc.isRequired,
        categoryId: doc.categoryId,
      });
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

  const handleDeleteDocument = (doc) => {
    Modal.confirm({
      title: "Удалить документ?",
      content: "Документ будет скрыт в списке.",
      okText: "Удалить",
      okType: "danger",
      cancelText: "Отмена",
      onOk: async () => {
        try {
          await otService.deleteDocument(doc.id);
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
      setTemplateFileList([]);
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

  const handleTemplateFileListChange = useCallback(
    (fileList) => setTemplateFileList(fileList.slice(-1)),
    [],
  );

  const handleInstructionFileListChange = useCallback(
    (fileList) => setInstructionFileList(fileList.slice(-1)),
    [],
  );

  const handleCloseDocumentCommentModal = useCallback(() => {
    setDocumentCommentModalOpen(false);
    setDocumentCommentTarget(null);
    setDocumentComments([]);
    setDocumentCommentText("");
  }, []);

  const handleOpenObject = (siteId) => {
    setSelectedConstructionSiteId(siteId);
    setActiveTab("object");
  };

  const handleOpenContractor = (counterpartyIdValue) => {
    setSelectedCounterpartyId(counterpartyIdValue);
    setActiveTab("contractor");
  };

  const handleTempAdmit = async (counterpartyIdValue) => {
    if (!counterpartyIdValue || !selectedConstructionSiteId) return;

    try {
      await otService.overrideContractorStatus(
        counterpartyIdValue,
        selectedConstructionSiteId,
      );
      message.success("Временный допуск установлен");
      await loadObjectStatuses(selectedConstructionSiteId);
    } catch (error) {
      console.error("Error overriding OT contractor status:", error);
      message.error("Ошибка при временном допуске подрядчика");
    }
  };

  const handleRecalculateStatus = async (counterpartyIdValue) => {
    if (!counterpartyIdValue || !selectedConstructionSiteId) return;

    try {
      await otService.recalculateContractorStatus(
        counterpartyIdValue,
        selectedConstructionSiteId,
      );
      message.success("Статус пересчитан");
      await loadObjectStatuses(selectedConstructionSiteId);
    } catch (error) {
      console.error("Error recalculating OT contractor status:", error);
      message.error("Ошибка при пересчете статуса подрядчика");
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

  const hasContractorSelection = useMemo(() => {
    if (isStaff) {
      return !!selectedConstructionSiteId && !!selectedCounterpartyId;
    }
    return !!selectedConstructionSiteId && !!user?.counterpartyId;
  }, [
    isStaff,
    selectedConstructionSiteId,
    selectedCounterpartyId,
    user?.counterpartyId,
  ]);

  const contractorCommentEnabled = useMemo(() => {
    if (!selectedConstructionSiteId) return false;
    const counterpartyIdValue = isStaff
      ? selectedCounterpartyId
      : user?.counterpartyId;
    return !!counterpartyIdValue;
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

  const counterpartyOptions = useMemo(() => {
    const filtered = defaultCounterpartyId
      ? counterparties.filter(
          (counterparty) => counterparty.id !== defaultCounterpartyId,
        )
      : counterparties;
    return filtered.map((counterparty) => ({
      label: counterparty.name || counterparty.id,
      value: counterparty.id,
    }));
  }, [counterparties, defaultCounterpartyId]);

  const categoryOptions = useMemo(() => {
    const buildOptions = (nodes, depth = 0) =>
      nodes.flatMap((node) => {
        const label = `${"— ".repeat(depth)}${node.name}`;
        return [
          { label, value: node.id, selectLabel: node.name },
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
            style={{
              width: "100%",
              justifyContent: "space-between",
            }}
          >
            <Space size={6}>
              <Text strong>{node.name}</Text>
              <Text type="secondary">({node.sortOrder || 0})</Text>
            </Space>
            <Space size={4}>
              <Tooltip title="Редактировать">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleOpenCategoryModal(node)}
                />
              </Tooltip>
              <Tooltip title="Удалить">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteCategory(node)}
                />
              </Tooltip>
            </Space>
          </Space>
        ),
        children: buildTree(node.children || []),
      }));

    return buildTree(settingsCategories || []);
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
          <Space size={6}>
            <Text strong>{node.name}</Text>
            {node.description && (
              <Tooltip title={node.description}>
                <InfoCircleOutlined />
              </Tooltip>
            )}
          </Space>
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
              >
                Скачать бланк
              </Button>
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

  return {
    t,
    isAllowed,
    isDefaultCounterpartyUser,
    activeTab,
    setActiveTab,
    isStaff,
    canManageSettings,
    isContractorUser,
    allSiteSummaries,
    allSiteLoading,
    handleOpenObject,
    constructionSiteOptions,
    selectedConstructionSiteId,
    setSelectedConstructionSiteId,
    selectCollapsedStyle,
    contractorSelectStyle,
    selectDropdownStyle,
    objectStatusSummary,
    objectStatusLoading,
    objectStatuses,
    contractorStatusMeta,
    handleTempAdmit,
    handleRecalculateStatus,
    handleOpenContractor,
    uploadInputRef,
    templateInputRef,
    handleFileChange,
    handleTemplateFileChange,
    counterpartyOptions,
    selectedCounterpartyId,
    setSelectedCounterpartyId,
    hasContractorSelection,
    contractorLoading,
    normalizedStats,
    contractorCommentsLoading,
    contractorComments,
    contractorCommentText,
    setContractorCommentText,
    contractorCommentEnabled,
    handleAddContractorComment,
    contractorCommentEditOpen,
    editingContractorComment,
    contractorCommentForm,
    handleOpenEditContractorComment,
    handleUpdateContractorComment,
    handleDeleteContractorComment,
    handleCloseContractorCommentEdit,
    contractorTree,
    renderTreeTitle,
    settingsLoading,
    settingsCategoryTree,
    handleOpenCategoryModal,
    categoryOptions,
    selectedCategoryId,
    setSelectedCategoryId,
    filteredDocuments,
    handleDownloadTemplate,
    templateUploadingId,
    handleTemplateUploadClick,
    handleOpenDocumentModal,
    handleDeleteDocument,
    latestInstruction,
    settingsInstructions,
    handleOpenInstructionModal,
    handleDownloadInstructionFile,
    categoryModalOpen,
    editingCategory,
    setCategoryModalOpen,
    handleCategorySubmit,
    categoryForm,
    selectFullStyle,
    documentModalOpen,
    editingDocument,
    setDocumentModalOpen,
    handleDocumentSubmit,
    documentForm,
    templateModalOpen,
    setTemplateModalOpen,
    handleTemplateSubmit,
    templateForm,
    templateFileList,
    handleTemplateFileListChange,
    instructionModalOpen,
    setInstructionModalOpen,
    handleInstructionSubmit,
    instructionForm,
    instructionFileList,
    handleInstructionFileListChange,
    documentCommentModalOpen,
    documentCommentTarget,
    handleCloseDocumentCommentModal,
    documentCommentsLoading,
    documentComments,
    documentCommentText,
    setDocumentCommentText,
    handleAddDocumentComment,
  };
};

export default useOccupationalSafety;
