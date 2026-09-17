const { MongoClient, ObjectId } = require('mongodb');

async function run() {
    const uri = "mongodb://localhost:27017";
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db("ystudy");
        const collection = db.collection("course_cms");

        const data = {
            courseId: new ObjectId("6a4665ce12fe986f727015bb"),
            section_2: {
                badge: "Available courses",
                title: "Business degrees you can study flexibly.",
                description: "Every route is built around work and family, with full Student Finance support."
            },
            section_3: {
                badge: "Who applies",
                title: "Business degrees suit you if…",
                description: "Four honest reasons adult learners choose this subject.",
                cards: [
                    { title: "You’re in management but lack the credential", description: "Many experienced managers hit a ceiling at director level without a formal qualification. The degree formalises what you already know and adds strategic frameworks." },
                    { title: "You’re changing career into business/finance", description: "Moving from trades, healthcare or the public sector into a business role typically requires a degree to enter at the appropriate level." },
                    { title: "You’re starting or growing your own business", description: "Strategy, financial management, marketing and operations modules give self-employed people a structured framework they often learn piecemeal." },
                    { title: "You’re in tech and need the business layer", description: "Technical professionals moving into product, leadership or consultancy roles often find a business degree the most direct route in." }
                ],
                status: true
            },
            section_4: {
                badge: "Career outcomes",
                title: "Where a Business degree takes you.",
                cards: [
                    { title: "£35k", description: "typical starting salary (management)" },
                    { title: "£55k", description: "average 10 years post-grad" },
                    { title: "92%", description: "graduate employment (15 months)" },
                    { title: "Every", description: "sector employs business graduates" }
                ],
                status: true
            },
            section_5: {
                badge: "Progression ladder",
                title: "How a Business career builds over time.",
                description: "A realistic path from first role to senior leadership, with typical UK salary at each step.",
                cards: [
                    { badge: "1", title: "Coordinator / Assistant", description: "Support a team, learn the operation.", salary: "£24k–£30k" },
                    { badge: "2", title: "Officer / Executive", description: "Own a workstream or function area.", salary: "£30k–£40k" },
                    { badge: "3", title: "Manager", description: "Lead people, budgets and delivery.", salary: "£40k–£60k" },
                    { badge: "4", title: "Senior / Head of", description: "Set direction for a department.", salary: "£60k–£90k" },
                    { badge: "4", title: "Director", description: "Accountable for strategy and P&L.", salary: "£90k+" }
                ],
                status: true
            },
            section_6: {
                badge: "Entry routes",
                title: "How to qualify without A-levels.",
                description: "Most adult applicants get in through one of these — no recent qualifications required.",
                status: true
            },
            section_7: {
                badge: "Related subjects",
                title: "Subjects that pair well with Business.",
                description: "Many adult learners combine interests. These routes share skills and career overlap.",
                status: true
            },
            section_8: {
                badge: "Conversion snapshot",
                title: "Before you apply, compare funding, salary and fit.",
                cards: [
                    { title: "Funding snapshot", description: "Business degrees are commonly eligible for Tuition Fee Loan and Maintenance Loan, subject to your circumstances.", link: "" },
                    { title: "Best for", description: "Managers, entrepreneurs, administrators, team leaders and career changers who want a broad degree.", link: "" },
                    { title: "Apply support", description: "YStudy can help you choose the route, prepare documents and understand the application steps.", link: "" }
                ],
                status: true
            },
            section_9: {
                badge: "Next steps",
                title: "Ready to study business?",
                description: "Three quick ways to move forward. No commitment, no spam — pick whichever fits where you are.",
                cards: [
                    { icon: "📝", title: "Start your application", description: "Apply with adviser support — save progress, track stages, get help when you need it.", link: "" },
                    { icon: "✅", title: "Check my eligibility", description: "Two minutes. Which courses you qualify for, your Student Finance entitlement, and any non-standard entry routes.", link: "" },
                    { icon: "🎓", title: "Browse all business courses", description: "Every SFE-eligible business degree with funding, mode and entry routes filtered to fit you.", link: "" }
                ],
                status: true
            },
            section_10: {
                badge: "Featured this week",
                title: "Editor’s pick in this subject.",
                description: "One course we currently rate especially highly for adult learners.",
                status: true
            },
            section_11: {
                cards: [
                    { title: "Check if you can get funded.", description: "Quickly understand if you may qualify for Student Finance, grants and flexible university routes." },
                    { title: "Apply with YStudy.", description: "Send us your details and we’ll help you choose the right course, prepare documents and move forward." },
                    { title: "Speak with an adviser.", description: "Not sure what to study, what you can get or which documents you need? Book a free call." }
                ],
                status: true
            },
            section_12: {
                title: "Useful next steps",
                description: "Move from information to action. Compare degrees, check funding, explore careers and apply with support.",
                cards: [
                    { title: "Find degrees", link: "Quickly understand if you may qualify for Student Finance, grants and flexible university routes." },
                    { title: "Funding hub", link: "Send us your details and we’ll help you choose the right course, prepare documents and move forward." },
                    { title: "Careers & salaries", link: "Not sure what to study, what you can get or which documents you need? Book a free call." },
                    { title: "Degree Match", link: "Not sure what to study, what you can get or which documents you need? Book a free call." },
                    { title: "Salary Checker", link: "Not sure what to study, what you can get or which documents you need? Book a free call." },
                    { title: "Student guides", link: "Not sure what to study, what you can get or which documents you need? Book a free call." }
                ],
                status: true
            }
        };

        const result = await collection.updateOne(
            { courseId: new ObjectId("6a4665ce12fe986f727015bb") },
            { $set: data },
            { upsert: true }
        );
        console.log("Upserted course_cms document:", result);
    } finally {
        await client.close();
    }
}
run().catch(console.dir);
