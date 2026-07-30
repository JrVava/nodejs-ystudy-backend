const { MongoClient, ObjectId } = require('mongodb');

async function run() {
    const uri = "mongodb://localhost:27017";
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db("ystudy");
        const collection = db.collection("course_cms");

        // IMPORTANT: Replace this with the actual courseId for your Social course
        const courseId = new ObjectId("6a5f887e72ccdf89c7f5c6b8");

        const data = {
            courseId: courseId,
            courseType: "Social",
            overview: {
                "tab": "Overview",
                "badge": "Course overview",
                "title": "A practical degree, built around your life.",
                "description": "A career-focused undergraduate degree for students who want a professionally relevant qualification they can study alongside work or family.",
                "cards": [
                    {
                        "icon": "🎯",
                        "title": "Who it suits",
                        "description": "Working adults already in business roles, career changers moving into management, and mature students returning to education who need a structured but flexible pathway. Many students are in their 30s and 40s, balancing work, family and study."
                    },
                    {
                        "icon": "📚",
                        "title": "What you'll learn",
                        "description": "Core business disciplines — management, marketing, operations, finance, strategy and leadership — plus transferable skills employers value: data analysis, professional communication, project planning and critical thinking."
                    },
                    {
                        "icon": "📝",
                        "title": "Assessment style",
                        "description": "A mix of coursework, group projects and presentations, with fewer traditional written exams than most people expect. This often suits mature students who prefer applied learning over exam technique."
                    }
                ],
                "statsCards": [
                    {
                        "title": "96%",
                        "description": "Match score"
                    },
                    {
                        "title": "95%",
                        "description": "Flexibility"
                    },
                    {
                        "title": "88%",
                        "description": "Value"
                    },
                    {
                        "title": "15–25",
                        "description": "Seminar group size"
                    }
                ],
                "status": true
            },
            salary: {
                "tab": "Salary",
                "badge": "Career outcomes",
                "title": "What jobs can this degree lead to?",
                "description": "Use salary and career routes to choose with confidence — outcome-driven, not module-heavy.",
                "cards": [
                    {
                        "image": "",
                        "title": "Business Analyst",
                        "pay": "£28k–£45k",
                        "description": "Analyse data, processes and business decisions.",
                        "link": ""
                    },
                    {
                        "image": "",
                        "title": "Operations Manager",
                        "pay": "£40k–£65k",
                        "description": "Lead teams, performance and operational systems.",
                        "link": ""
                    },
                    {
                        "image": "",
                        "title": "Project Manager",
                        "pay": "£42k–£70k",
                        "description": "Plan and deliver business projects.",
                        "link": ""
                    },
                    {
                        "image": "",
                        "title": "Commercial Manager",
                        "pay": "£42k–£70k",
                        "description": "Plan and deliver business projects.",
                        "link": ""
                    }
                ],
                "status": true
            },
            funding: {
                "tab": "Funding",
                "section_1": {
                    "badge": "Student Finance",
                    "title": "Estimate support before applying.",
                    "description": "This is indicative only. Final entitlement depends on SFE assessment, household income, location, course intensity and study mode.",
                    "cardTItle": "Total possible support",
                    "cardDescription": "£23,925",
                    "cards": [
                        {
                            "title": "£9,790",
                            "description": "Tuition Fee Loan",
                            "link": ""
                        },
                        {
                            "title": "£14,135",
                            "description": "Maintenance Loan",
                            "link": ""
                        },
                        {
                            "title": "Extra grants",
                            "description": "Check eligibility",
                            "link": ""
                        },
                        {
                            "title": "",
                            "description": "",
                            "link": ""
                        }
                    ],
                    "status": true
                },
                "section_2": {
                    "badge": "Why this course",
                    "title": "Why choose Business Management?",
                    "description": "Salary, finance, flexibility and outcomes — what adult learners actually need before applying.",
                    "cards": [
                        {
                            "icon": "💼",
                            "title": "Career-focused",
                            "description": "Build practical business knowledge for management, operations and analyst roles."
                        },
                        {
                            "icon": "⏱",
                            "title": "Flexible schedule",
                            "description": "Designed for working adults who need a realistic weekly study rhythm."
                        },
                        {
                            "icon": "💷",
                            "title": "Student Finance route",
                            "description": "Check tuition and maintenance support before applying."
                        },
                        {
                            "icon": "🤝",
                            "title": "Adviser support",
                            "description": "YStudy can help organise documents, interview prep and next steps."
                        },
                        {
                            "icon": "📈",
                            "title": "Transferable skills",
                            "description": "Leadership, communication, data, finance and business decision-making."
                        },
                        {
                            "icon": "🎓",
                            "title": "Progression routes",
                            "description": "Move into postgraduate study, professional routes or management positions."
                        }
                    ],
                    "status": true
                }
            },
            study: {
                "section_1": {
                    "tab": "Study",
                    "badge": "Study structure",
                    "title": "What you could study.",
                    "description": "Clear year-by-year cards are easier to scan than long module tables.",
                    "cards": [
                        {
                            "number": "1",
                            "title": "Year 1: Foundations",
                            "description": "Build the business basics and academic confidence.",
                            "points": [
                                "Business environment",
                                "Marketing principles",
                                "Academic skills",
                                "Finance basics"
                            ]
                        },
                        {
                            "icon": "2",
                            "title": "Year 2: Applied management",
                            "description": "Move into people, operations and business decisions.",
                            "points": [
                                "Operations management",
                                "Managing people",
                                "Business analytics",
                                "Project planning"
                            ]
                        },
                        {
                            "icon": "3",
                            "title": "Year 3: Career direction",
                            "description": "Use projects and strategy to prepare for progression.",
                            "points": [
                                "Strategic management",
                                "Leadership",
                                "Major project",
                                "Career planning"
                            ]
                        }
                    ],
                    "status": true
                },
                "section_2": {
                    "badge": "Study modes",
                    "title": "Choose the safest route for your life.",
                    "description": "Study mode affects timetable, flexibility and sometimes Maintenance Loan eligibility.",
                    "status": true
                }
            },
            reviews: {
                "tab": "Reviews",
                "badge": "Student stories",
                "title": "People like you choose this route.",
                "description": "Real journeys from adult learners — not a generic university brochure.",
                "status": true
            },
            Entry: {
                "tab": "Entry",
                "section_1": {
                    "badge": "Entry requirements",
                    "title": "Not sure if you qualify?",
                    "description": "We keep entry requirements simple and route unclear cases to free adviser support.",
                    "cards": [
                        {
                            "parentClass": "entryrow",
                            "icon": "✓",
                            "title": "A Levels",
                            "description": "Accepted route."
                        },
                        {
                            "parentClass": "entryrow",
                            "icon": "✓",
                            "title": "Access Course",
                            "description": "Common adult route."
                        },
                        {
                            "parentClass": "entryrow",
                            "icon": "✓",
                            "title": "BTEC",
                            "description": "Accepted where suitable."
                        },
                        {
                            "parentClass": "entryrow",
                            "icon": "✓",
                            "title": "International",
                            "description": "Check equivalency."
                        },
                        {
                            "parentClass": "entryrow q",
                            "icon": "?",
                            "title": "Not sure? ",
                            "description": "Ask adviser first."
                        }
                    ],
                    "status": true
                },
                "section_2": {
                    "badge": "Upcoming intakes",
                    "title": "Choose your start date.",
                    "description": "Multiple intakes a year mean you don't have to wait for September.",
                    "status": true
                },
                "section_3": {
                    "badge": "Application toolkit",
                    "title": "Need a CV and personal statement?",
                    "description": "Create a professional CV, build a strong personal statement and get free adviser guidance.",
                    "cards": [
                        {
                            "icons": "📄",
                            "title": "CV Builder",
                            "description": "A university-ready CV for mature students and career changers.",
                            "btnName": "Build my CV →",
                            "link": ""
                        },
                        {
                            "icons": "✍️",
                            "title": "Personal Statement",
                            "description": "Explain your motivation and experience clearly.",
                            "btnName": "Build statement →",
                            "link": ""
                        },
                        {
                            "icons": "🎓",
                            "title": "Free Academic Review",
                            "description": "Advisers review your documents and suggest improvements.",
                            "btnName": "Request review →",
                            "link": ""
                        },
                        {
                            "icons": "🤝",
                            "title": "Speak to an Adviser",
                            "description": "Help with course choice, funding and application steps.",
                            "btnName": "Book free call →",
                            "link": ""
                        }
                    ],
                    "status": true
                },
                "section_4": {
                    "title": "BA Business Management",
                    "description": "£24k–£55k+ salary · up to £14k+ maintenance signal · 95 match",
                    "status": true
                },
                "section_5": {
                    "badge": "Not sure this is for you?",
                    "title": "Try a different direction.",
                    "description": "Four very different paths — each Student Finance eligible and open to non-traditional entry.",
                    "status": true
                }
            },
            FAQ: {
                "section_1": {
                    "tab": "FAQ",
                    "badge": "FAQ",
                    "title": "Questions before applying.",
                    "description": "Clear answers reduce uncertainty before you apply.",
                    "status": true
                },
                "section_2": {
                    "badge": "Ready to apply?",
                    "title": "Get help before submitting anything important.",
                    "description": "YStudy can help with course selection, Student Finance, documents and application steps."
                },
                "section_3": {
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
                "section_4": {
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
            }
        };

        const result = await collection.updateOne(
            { courseId: courseId },
            { $set: data },
            { upsert: true }
        );
        console.log("Upserted Social course_cms document:", result);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
run().catch(console.dir);
