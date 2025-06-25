import Layout from "../components/Layout"

export default function AdminPage() {
    return (
        <Layout role={"admin"} user={{
            name: "",
            profilePic: ""
        }}>
        <main>
            <h1>Admin Dashboard</h1>
            <p>Welcome to the Library Management System Admin Page.</p>
        </main>
        </Layout>
    );
}