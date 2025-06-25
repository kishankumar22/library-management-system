import Layout from "../components/Layout"

export default function StudentPage() {
    return (
        <Layout role={"student"} user={{
            name: "",
            profilePic: ""
        }}>
        <main>
            <h1>Student Dashboard</h1>
            <p>Welcome to the Library Management System Student Page.</p>
        </main>
        </Layout>
    );
}