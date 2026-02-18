import { buildMobileEmployeeCounterpartySection } from "@/modules/employees/ui/form/MobileEmployeeCounterpartySection";
import { buildMobileEmployeeDocumentsSection } from "@/modules/employees/ui/form/MobileEmployeeDocumentsSection";
import { buildMobileEmployeePatentSection } from "@/modules/employees/ui/form/MobileEmployeePatentSection";

export const buildMobileDocumentSections = ({
  getFieldProps,
  requiresPatent,
  formatSnils,
  formatKig,
  passportType,
  setPassportType,
  formatRussianPassportNumber,
  noAutoFillProps,
  mobileOcrState,
  employee,
  ensureEmployeeId,
  handleDocumentUploadComplete,
  formatPatentNumber,
  formatBlankNumber,
  loadingCounterparties,
  availableCounterparties,
}) => {
  const sections = [];

  sections.push(
    buildMobileEmployeeDocumentsSection({
      getFieldProps,
      requiresPatent,
      formatSnils,
      formatKig,
      passportType,
      setPassportType,
      formatRussianPassportNumber,
      noAutoFillProps,
      mobileOcrState,
      employee,
      ensureEmployeeId,
      handleDocumentUploadComplete,
    }),
  );

  const patentSection = buildMobileEmployeePatentSection({
    requiresPatent,
    getFieldProps,
    formatPatentNumber,
    noAutoFillProps,
    formatBlankNumber,
  });

  if (patentSection) {
    sections.push(patentSection);
  }

  sections.push(
    buildMobileEmployeeCounterpartySection({
      loadingCounterparties,
      availableCounterparties,
    }),
  );

  return sections;
};
