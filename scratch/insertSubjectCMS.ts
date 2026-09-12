import { connectDB } from "../src/database/mongo";
import { QueryBuilder } from "../src/database/QueryBuilder";
import { ObjectId } from "mongodb";
import { SubjectCms } from "../src/models/SubjectCms";

async function run() {
    await connectDB();

    // Use the 24-character hex string as an ObjectId.
    // The provided ID is 6a5a71f9b101299e4b8d33a1. Wait, 6a5a71f9b101299e4b8d33a1 is 24 chars long.
    const subjectId = new ObjectId("6a5a71f9b101299e4b8d33a1");

    const payload = {
        "section_2": {
            "badge": "Popular courses",
            "title": "Health & Social Care courses adults often compare.",
            "description": "Use these as starting points. An adviser can help you choose the most realistic route.",
            "status": true
        },
        "section_3": {
            "badge": "Why study this subject?",
            "title": "Useful if you want a practical career direction.",
            "description": "This subject can work well for mature students because it connects study with real job roles, progression and professional confidence.",
            "cards": [
                {
                    "title": "Career change",
                    "description": "Use the degree to move into a new sector with a recognised academic route."
                },
                {
                    "title": "Promotion route",
                    "description": "Formalise work experience and prepare for supervisor, manager or specialist roles."
                },
                {
                    "title": "Flexible study",
                    "description": "Compare blended, online and campus routes around work and family commitments."
                }
            ],
            "status": true
        },
        "section_4": {
            "badge": "Career outcomes",
            "title": "Roles this subject can lead towards.",
            "cards": [
                {
                    "title": "Support Manager",
                    "description": "Build relevant academic knowledge, transferable skills and practical confidence for this direction."
                },
                {
                    "title": "Public Health Officer",
                    "description": "Build relevant academic knowledge, transferable skills and practical confidence for this direction."
                },
                {
                    "title": "Safeguarding Lead",
                    "description": "Build relevant academic knowledge, transferable skills and practical confidence for this direction."
                },
                {
                    "title": "Service Manager",
                    "description": "Build relevant academic knowledge, transferable skills and practical confidence for this direction."
                }
            ],
            "status": true
        },
        "section_5": {
            "badge": "Salary progression",
            "title": "Typical earning stages to compare.",
            "description": "Figures vary by region, employer and experience, but students like to see the pathway clearly.",
            "cards": [
                {
                    "title": "Entry",
                    "price": "£23k",
                    "description": "First graduate or transition roles."
                },
                {
                    "title": "Progressed",
                    "price": "£38k",
                    "description": "Experienced specialist or manager roles."
                },
                {
                    "title": "Senior",
                    "price": "£55k+",
                    "description": "Leadership, consultancy or high-responsibility roles."
                }
            ],
            "status": true
        },
        "section_6": {
            "cards": [
                {
                    "className": "v705-card dark",
                    "badge": "Funding snapshot",
                    "title": "Check funding before you apply.",
                    "description": "Most full-time undergraduate routes can be supported by Tuition Fee Loan and Maintenance Loan if you meet eligibility rules.",
                    "link": "",
                    "linkName": "Learn more"
                },
                {
                    "className": "v705-card",
                    "badge": "",
                    "title": "Tuition Fee Loan",
                    "description": "Can cover eligible tuition fees so you do not usually pay upfront.",
                    "link": "",
                    "linkName": "Learn more"
                },
                {
                    "className": "v705-card",
                    "badge": "",
                    "title": "Maintenance Loan",
                    "description": "Can help with living costs while studying. Amount depends on your circumstances.",
                    "link": "",
                    "linkName": "Estimate support"
                }
            ],
            "status": true
        },
        "section_7": {
            "badge": "Related subjects",
            "title": "Compare nearby routes.",
            "status": true
        },
        "section_8": {
            "badge": "FAQ",
            "title": "Questions before choosing Computing & Cyber Security.",
            "status": true
        },
        "section_9": {
            "title": "Want help choosing a Computing & Cyber Security course?",
            "description": "Check your eligibility or apply with adviser support.",
            "status": true
        },
        "section_10": {
            "cards": [
                {
                    "title": "Check if you can get funded.",
                    "description": "Quickly understand if you may qualify for Student Finance, grants and flexible university routes."
                },
                {
                    "title": "Apply with YStudy.",
                    "description": "Send us your details and we’ll help you choose the right course, prepare documents and move forward."
                },
                {
                    "title": "Speak with an adviser.",
                    "description": "Not sure what to study, what you can get or which documents you need? Book a free call."
                }
            ],
            "status": true
        },
        "section_11": {
            "title": "Useful next steps",
            "description": "Move from information to action. Compare degrees, check funding, explore careers and apply with support.",
            "cards": [
                {
                    "title": "Find degrees",
                    "link": "Quickly understand if you may qualify for Student Finance, grants and flexible university routes."
                },
                {
                    "title": "Funding hub",
                    "link": "Send us your details and we’ll help you choose the right course, prepare documents and move forward."
                },
                {
                    "title": "Careers & salaries",
                    "link": "Not sure what to study, what you can get or which documents you need? Book a free call."
                },
                {
                    "title": "Degree Match",
                    "link": "Not sure what to study, what you can get or which documents you need? Book a free call."
                },
                {
                    "title": "Salary Checker",
                    "link": "Not sure what to study, what you can get or which documents you need? Book a free call."
                },
                {
                    "title": "Student guides",
                    "link": "Not sure what to study, what you can get or which documents you need? Book a free call."
                }
            ],
            "status": true
        }
    };

    const subjectCmsDB = new QueryBuilder<SubjectCms>("subjectCMS");

    const existing = await subjectCmsDB.findOne({ subjectId });
    if (existing) {
        await subjectCmsDB.updateOne({ subjectId }, { $set: { ...payload, updatedAt: new Date() } });
        console.log("✅ Updated existing CMS record.");
    } else {
        await subjectCmsDB.insertOne({
            subjectId,
            ...payload,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log("✅ Inserted new CMS record.");
    }

    // @ts-ignore
    process.exit(0);
}

run().catch(error => {
    console.error("❌ Error running script:", error);
    // @ts-ignore
    process.exit(1);
});
