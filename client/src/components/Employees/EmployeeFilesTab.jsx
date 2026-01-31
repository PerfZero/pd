import DocumentTypeUploader from "./DocumentTypeUploader.jsx";

const EmployeeFilesTab = ({ employeeId, onFilesUpdated }) => (
  <DocumentTypeUploader
    employeeId={employeeId}
    readonly={false}
    onFilesUpdated={onFilesUpdated}
  />
);

export default EmployeeFilesTab;
