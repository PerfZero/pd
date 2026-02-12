import { useCallback, useState } from "react";
import { Form, Modal, message } from "antd";
import otService from "@/services/otService";

const useOtContractorComments = ({ constructionSiteId, counterpartyId }) => {
  const [contractorComments, setContractorComments] = useState([]);
  const [contractorCommentsLoading, setContractorCommentsLoading] =
    useState(false);
  const [contractorCommentText, setContractorCommentText] = useState("");
  const [contractorCommentEditOpen, setContractorCommentEditOpen] =
    useState(false);
  const [editingContractorComment, setEditingContractorComment] =
    useState(null);
  const [contractorCommentForm] = Form.useForm();

  const loadContractorComments = useCallback(async () => {
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
  }, [constructionSiteId, counterpartyId]);

  const handleAddContractorComment = async () => {
    if (!counterpartyId || !constructionSiteId) return;
    if (!contractorCommentText.trim()) return;

    try {
      await otService.createComment({
        type: "contractor",
        counterpartyId,
        constructionSiteId,
        text: contractorCommentText.trim(),
      });
      setContractorCommentText("");
      await loadContractorComments();
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
      await otService.updateComment(editingContractorComment.id, { text });
      message.success("Комментарий обновлен");
      setContractorCommentEditOpen(false);
      setEditingContractorComment(null);
      await loadContractorComments();
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
          await loadContractorComments();
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

  return {
    contractorComments,
    contractorCommentsLoading,
    contractorCommentText,
    setContractorCommentText,
    contractorCommentEditOpen,
    editingContractorComment,
    contractorCommentForm,
    loadContractorComments,
    handleAddContractorComment,
    handleOpenEditContractorComment,
    handleUpdateContractorComment,
    handleDeleteContractorComment,
    handleCloseContractorCommentEdit,
  };
};

export default useOtContractorComments;
