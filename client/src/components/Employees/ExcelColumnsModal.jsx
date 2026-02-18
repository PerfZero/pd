import { Modal, Divider, Space, Button } from "antd";
import ColumnSetFormModal from "./ColumnSetFormModal";
import ExcelColumnsPickerPanel from "./ExcelColumnsPickerPanel";
import ExcelColumnsSetsPanel from "./ExcelColumnsSetsPanel";
import { useExcelColumnsModalSets } from "@/modules/employees/model/useExcelColumnsModalSets";

/**
 * Модальное окно для выбора и упорядочивания столбцов экспорта в Excel
 * С поддержкой сохранения и загрузки наборов столбцов
 */
const ExcelColumnsModal = ({
  visible,
  onCancel,
  columns,
  onUpdate,
  toggleColumn,
  moveColumnUp,
  moveColumnDown,
  selectAll,
  deselectAll,
}) => {
  const {
    columnSets,
    setsLoading,
    isFormModalVisible,
    editingSet,
    handleCreateSet,
    handleEditSet,
    handleSubmitSet,
    handleApplySet,
    handleDeleteSet,
    handleSetDefault,
    handleUpdateSetColumns,
    handleCloseFormModal,
  } = useExcelColumnsModalSets({
    columns,
    onUpdate,
  });

  const activeCount = columns.filter((column) => column.enabled).length;
  const totalCount = columns.length;

  return (
    <>
      <Modal
        title="Столбцы для экспорта"
        open={visible}
        onCancel={onCancel}
        width={900}
        wrapClassName="full-height-modal"
        style={{ top: "5vh", height: "90vh", display: "flex", flexDirection: "column" }}
        styles={{
          body: {
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            padding: "12px",
            overflowY: "auto",
          },
          content: { display: "flex", flexDirection: "column", height: "100%" },
        }}
        footer={
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onCancel}>Закрыть</Button>
          </Space>
        }
      >
        <div style={{ display: "flex", gap: 16, height: "100%" }}>
          <ExcelColumnsPickerPanel
            columns={columns}
            activeCount={activeCount}
            totalCount={totalCount}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            onToggleColumn={toggleColumn}
            onMoveColumnUp={moveColumnUp}
            onMoveColumnDown={moveColumnDown}
          />

          <Divider type="vertical" style={{ height: "auto", margin: "0 8px" }} />

          <ExcelColumnsSetsPanel
            columnSets={columnSets}
            setsLoading={setsLoading}
            onCreateSet={handleCreateSet}
            onApplySet={handleApplySet}
            onSetDefault={handleSetDefault}
            onUpdateSetColumns={handleUpdateSetColumns}
            onEditSet={handleEditSet}
            onDeleteSet={handleDeleteSet}
          />
        </div>
      </Modal>

      <ColumnSetFormModal
        visible={isFormModalVisible}
        onCancel={handleCloseFormModal}
        onSubmit={handleSubmitSet}
        editingSet={editingSet}
        loading={setsLoading}
      />
    </>
  );
};

export default ExcelColumnsModal;
