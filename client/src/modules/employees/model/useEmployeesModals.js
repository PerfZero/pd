import { useCallback, useState } from "react";

export const useEmployeesModals = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isSitesModalOpen, setIsSitesModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [filesEmployee, setFilesEmployee] = useState(null);
  const [sitesEmployee, setSitesEmployee] = useState(null);

  const openCreateModal = useCallback(() => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingEmployee(null);
  }, []);

  const openViewModal = useCallback((employee) => {
    setViewingEmployee(employee);
    setIsViewModalOpen(true);
  }, []);

  const closeViewModal = useCallback(() => {
    setIsViewModalOpen(false);
  }, []);

  const closeMobileView = useCallback(() => {
    setIsViewModalOpen(false);
    setViewingEmployee(null);
  }, []);

  const openFilesModal = useCallback((employee) => {
    setFilesEmployee(employee);
    setIsFilesModalOpen(true);
  }, []);

  const closeFilesModal = useCallback(() => {
    setIsFilesModalOpen(false);
    setFilesEmployee(null);
  }, []);

  const openSitesModal = useCallback((employee) => {
    setSitesEmployee(employee);
    setIsSitesModalOpen(true);
  }, []);

  const closeSitesModal = useCallback(() => {
    setIsSitesModalOpen(false);
    setSitesEmployee(null);
  }, []);

  const openRequestModal = useCallback(() => {
    setIsRequestModalOpen(true);
  }, []);

  return {
    isModalOpen,
    setIsModalOpen,
    isViewModalOpen,
    setIsViewModalOpen,
    isFilesModalOpen,
    setIsFilesModalOpen,
    isRequestModalOpen,
    setIsRequestModalOpen,
    isExportModalOpen,
    setIsExportModalOpen,
    isImportModalOpen,
    setIsImportModalOpen,
    isSecurityModalOpen,
    setIsSecurityModalOpen,
    isSitesModalOpen,
    setIsSitesModalOpen,
    editingEmployee,
    setEditingEmployee,
    viewingEmployee,
    setViewingEmployee,
    filesEmployee,
    sitesEmployee,
    openCreateModal,
    openEditModal,
    closeEditModal,
    openViewModal,
    closeViewModal,
    closeMobileView,
    openFilesModal,
    closeFilesModal,
    openSitesModal,
    closeSitesModal,
    openRequestModal,
  };
};
