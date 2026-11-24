import { QueryBuilder } from "../QueryBuilder";
import { FormSendEmailToUser } from "../../models/FormSendEmailToUser";

export const defaultFormNames: string[] = [
  "Degree Match",
  "Eligibility Checker",
  "Become An Adviser",
  "Influencers",
  "Affiliate Partners",
  "Business",
  "Refer A friend",
  "Adviser Lead"
];

export const formSendEmailSeeder = async () => {
  const qb = new QueryBuilder<FormSendEmailToUser>("form_send_email_to_users");

  let insertedCount = 0;
  let skippedCount = 0;

  for (const formName of defaultFormNames) {
    const escaped = formName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existing = await qb.findOne({
      formName: { $regex: new RegExp(`^${escaped}$`, "i") },
      isDeleted: { $ne: true }
    });

    if (existing) {
      skippedCount++;
    } else {
      await qb.insertOne({
        formName,
        sendEmail: false,
        status: false,
        sendEmailToAdmin: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      insertedCount++;
    }
  }

  console.log(`✅ FormSendEmail seeded. Inserted: ${insertedCount}, Skipped: ${skippedCount}`);
};
