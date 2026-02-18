import { renderUploads } from "./MobileEmployeeDocumentSectionUtils";

const MobileEmployeeUploadsSection = ({
  uploads,
  employee,
  ensureEmployeeId,
  handleDocumentUploadComplete,
}) =>
  renderUploads({
    uploads,
    employee,
    ensureEmployeeId,
    handleDocumentUploadComplete,
  });

export default MobileEmployeeUploadsSection;
