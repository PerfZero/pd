import axios from "axios";
import { OtComment } from "../models/index.js";

const buildNotificationText = ({ constructionSite, missingDocuments }) => {
  const siteName =
    constructionSite?.shortName || constructionSite?.fullName || "объект";
  const docNames = missingDocuments.map((doc) => doc.name).filter(Boolean);
  const list = docNames.length ? docNames.join(", ") : "неизвестно";

  return `Объект: ${siteName}. Не хватает документов: ${list}.`;
};

const sendEmail = async ({ to, subject, text }) => {
  const webhookUrl =
    process.env.OT_EMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL;

  if (!webhookUrl || !to) {
    console.warn("OT email notification skipped", { to, subject });
    return false;
  }

  await axios.post(webhookUrl, {
    to,
    subject,
    text,
  });

  return true;
};

const createPortalNotification = async ({
  counterparty,
  constructionSite,
  text,
  createdBy,
}) => {
  if (!counterparty?.id || !constructionSite?.id || !createdBy) return null;

  return OtComment.create({
    type: "contractor",
    counterpartyId: counterparty.id,
    constructionSiteId: constructionSite.id,
    text,
    createdBy,
  });
};

export const notifyNotAdmitted = async ({
  counterparty,
  constructionSite,
  missingDocuments = [],
  changedBy = null,
}) => {
  const text = buildNotificationText({ constructionSite, missingDocuments });

  await Promise.allSettled([
    createPortalNotification({
      counterparty,
      constructionSite,
      text,
      createdBy: changedBy,
    }),
    sendEmail({
      to: counterparty?.email || null,
      subject: "Охрана труда: подрядчик не допущен",
      text,
    }),
  ]);

  console.log("OT notification: contractor not admitted", {
    counterpartyId: counterparty?.id,
    counterpartyName: counterparty?.name,
    constructionSiteId: constructionSite?.id,
    constructionSiteName:
      constructionSite?.shortName || constructionSite?.fullName,
    missingDocuments: missingDocuments.map((doc) => doc.name).filter(Boolean),
  });
};
