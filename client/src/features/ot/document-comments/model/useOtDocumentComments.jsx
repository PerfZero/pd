import { useCallback, useState } from "react";
import { message } from "antd";
import otService from "@/services/otService";

const useOtDocumentComments = () => {
  const [documentComments, setDocumentComments] = useState([]);
  const [documentCommentsLoading, setDocumentCommentsLoading] = useState(false);
  const [documentCommentText, setDocumentCommentText] = useState("");
  const [documentCommentModalOpen, setDocumentCommentModalOpen] =
    useState(false);
  const [documentCommentTarget, setDocumentCommentTarget] = useState(null);

  const handleOpenDocumentComments = async (doc) => {
    if (!doc?.contractorDocumentId || !doc?.fileCount) return;

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

  const handleDeleteDocumentComment = async (comment) => {
    if (!comment?.id) return;
    if (!documentCommentTarget?.contractorDocumentId) return;

    try {
      await otService.deleteComment(comment.id);
      const response = await otService.getComments({
        type: "document",
        contractorDocumentId: documentCommentTarget.contractorDocumentId,
      });
      setDocumentComments(response.data?.data || []);
      message.success("Комментарий удален");
    } catch (error) {
      console.error("Error deleting OT document comment:", error);
      message.error("Ошибка при удалении комментария");
    }
  };

  const handleCloseDocumentCommentModal = useCallback(() => {
    setDocumentCommentModalOpen(false);
    setDocumentCommentTarget(null);
    setDocumentComments([]);
    setDocumentCommentText("");
  }, []);

  return {
    documentComments,
    documentCommentsLoading,
    documentCommentText,
    setDocumentCommentText,
    documentCommentModalOpen,
    documentCommentTarget,
    handleOpenDocumentComments,
    handleAddDocumentComment,
    handleDeleteDocumentComment,
    handleCloseDocumentCommentModal,
  };
};

export default useOtDocumentComments;
