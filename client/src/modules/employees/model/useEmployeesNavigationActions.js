import { useCallback } from "react";

export const useEmployeesNavigationActions = ({
  isMobile,
  navigate,
  openCreateModal,
  openEditModal,
  openViewModal,
  openFilesModal,
  openSitesModal,
  openRequestModal,
  closeMobileView,
  setEditingEmployee,
  viewingEmployee,
}) => {
  const handleAdd = useCallback(() => {
    if (isMobile) {
      navigate("/employees/add");
      return;
    }
    openCreateModal();
  }, [isMobile, navigate, openCreateModal]);

  const handleEdit = useCallback(
    (employee) => {
      if (isMobile) {
        navigate(`/employees/edit/${employee.id}`);
        return;
      }
      openEditModal(employee);
    },
    [isMobile, navigate, openEditModal],
  );

  const handleView = useCallback(
    (employee) => {
      openViewModal(employee);
    },
    [openViewModal],
  );

  const handleViewFiles = useCallback(
    (employee) => {
      openFilesModal(employee);
    },
    [openFilesModal],
  );

  const handleConstructionSitesEdit = useCallback(
    (employee) => {
      openSitesModal(employee);
    },
    [openSitesModal],
  );

  const handleRequest = useCallback(() => {
    if (isMobile) {
      navigate("/employees/request");
      return;
    }
    openRequestModal();
  }, [isMobile, navigate, openRequestModal]);

  const handleMobileViewEdit = useCallback(() => {
    closeMobileView();
    setEditingEmployee(viewingEmployee);
    navigate(`/employees/edit/${viewingEmployee.id}`);
  }, [closeMobileView, setEditingEmployee, viewingEmployee, navigate]);

  return {
    handleAdd,
    handleEdit,
    handleView,
    handleViewFiles,
    handleConstructionSitesEdit,
    handleRequest,
    handleMobileViewEdit,
  };
};
