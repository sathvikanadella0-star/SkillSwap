import React, { useEffect, useState } from "react";
import api from "./api";

function App() {
    const [user, setUser] = useState(
        JSON.parse(localStorage.getItem("user") || "null")
    );

    const [skills, setSkills] = useState([]);
    const [requests, setRequests] = useState([]);

    const [page, setPage] = useState("home");
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        department: ""
    });

    const [skill, setSkill] = useState({
        title: "",
        category: "",
        description: "",
        level: "Beginner"
    });

    const [message, setMessage] = useState("");

    async function loadSkills() {
        try {
            const res = await api.get("/skills", {
                params: { search }
            });
            setSkills(res.data);
        } catch (error) {
            setMessage("Unable to load skills");
        }
    }

    async function loadRequests() {
        if (!localStorage.getItem("token")) return;

        try {
            const res = await api.get("/requests");
            setRequests(res.data);
        } catch (error) {
            setMessage("Unable to load requests");
        }
    }

    useEffect(() => {
        loadSkills();
    }, [search]);

    useEffect(() => {
        if (user) {
            loadRequests();
        }
    }, [user]);

    async function register(e) {
        e.preventDefault();

        try {
            const res = await api.post("/auth/register", form);
            saveLogin(res.data);
            setMessage("Registration successful!");
        } catch (error) {
            setMessage(error.response?.data?.message || "Registration failed");
        }
    }

    async function login(e) {
        e.preventDefault();

        try {
            const res = await api.post("/auth/login", {
                email: form.email,
                password: form.password
            });

            saveLogin(res.data);
            setMessage("Login successful!");
        } catch (error) {
            setMessage(error.response?.data?.message || "Login failed");
        }
    }

    function saveLogin(data) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
        setPage("home");
    }

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setRequests([]);
        setPage("home");
        setMessage("Logged out successfully");
    }

    async function saveSkill(e) {
        e.preventDefault();

        try {
            if (editingId) {
                await api.put(`/skills/${editingId}`, skill);
                setMessage("Skill updated successfully!");
            } else {
                await api.post("/skills", skill);
                setMessage("Skill added successfully!");
            }

            setSkill({
                title: "",
                category: "",
                description: "",
                level: "Beginner"
            });

            setEditingId(null);
            setPage("home");
            loadSkills();

        } catch (error) {
            setMessage(error.response?.data?.message || "Unable to save skill");
        }
    }

    function editSkill(item) {
        setSkill({
            title: item.title,
            category: item.category,
            description: item.description,
            level: item.level
        });

        setEditingId(item._id);
        setPage("add");
    }

    async function deleteSkill(id) {
        if (!window.confirm("Are you sure you want to delete this skill?")) {
            return;
        }

        try {
            await api.delete(`/skills/${id}`);
            setMessage("Skill deleted successfully");
            loadSkills();
        } catch (error) {
            setMessage(error.response?.data?.message || "Delete failed");
        }
    }

    async function sendRequest(skillId) {
        try {
            await api.post("/requests", {
                skillId,
                message: "I am interested in learning this skill."
            });

            setMessage("Learning request sent!");
            loadRequests();
        } catch (error) {
            setMessage(error.response?.data?.message || "Request failed");
        }
    }

    async function updateRequest(id, status) {
        try {
            await api.patch(`/requests/${id}`, { status });

            setMessage(`Request ${status.toLowerCase()} successfully`);
            loadRequests();
        } catch (error) {
            setMessage(error.response?.data?.message || "Update failed");
        }
    }

    return (
        <div className="app">

            <nav className="navbar">
                <h2>SkillSwap</h2>

                <div className="nav-links">
                    <button onClick={() => setPage("home")}>Home</button>

                    <button onClick={() => setPage("home")}>
                        Explore Skills
                    </button>

                    {user && (
                        <>
                            <button onClick={() => {
                                setEditingId(null);
                                setSkill({
                                    title: "",
                                    category: "",
                                    description: "",
                                    level: "Beginner"
                                });
                                setPage("add");
                            }}>
                                Add Skill
                            </button>

                            <button onClick={() => {
                                loadRequests();
                                setPage("requests");
                            }}>
                                Requests
                            </button>

                            <button onClick={logout}>Logout</button>
                        </>
                    )}

                    {!user && (
                        <button onClick={() => setPage("login")}>
                            Login / Register
                        </button>
                    )}
                </div>
            </nav>

            {message && (
                <div className="message">
                    {message}
                    <button onClick={() => setMessage("")}>×</button>
                </div>
            )}

            {page === "home" && (
                <>
                    <section className="hero">
                        <h1>Share Skills. Learn Together.</h1>

                        <p>
                            Connect with students, share your knowledge
                            and learn something new every day.
                        </p>

                        <button onClick={() => {
                            if (user) setPage("add");
                            else setPage("login");
                        }}>
                            Start Sharing
                        </button>
                    </section>

                    <section className="content">
                        <h2>Explore Student Skills</h2>

                        <input
                            className="search"
                            placeholder="Search skills or categories..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        <div className="skill-grid">
                            {skills.map((item) => (
                                <div className="skill-card" key={item._id}>
                                    <span className="category">
                                        {item.category}
                                    </span>

                                    <h3>{item.title}</h3>

                                    <p>{item.description}</p>

                                    <p>
                                        Level: {item.level}
                                    </p>

                                    <p>
                                        Student: {item.owner?.name}
                                    </p>

                                    {user && (
                                        <>
                                            {item.owner?._id === user.id ? (
                                                <>
                                                    <button onClick={() => editSkill(item)}>
                                                        Edit
                                                    </button>

                                                    <button
                                                        className="delete"
                                                        onClick={() => deleteSkill(item._id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => sendRequest(item._id)}>
                                                    Request to Learn
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        {skills.length === 0 && (
                            <p className="empty">
                                No skills found. Be the first to add one!
                            </p>
                        )}
                    </section>
                </>
            )}

            {page === "login" && (
                <section className="form-container">
                    <h2>Student Account</h2>

                    <form onSubmit={login}>
                        <input
                            placeholder="Email"
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => setForm({
                                ...form,
                                email: e.target.value
                            })}
                        />

                        <input
                            placeholder="Password"
                            type="password"
                            required
                            value={form.password}
                            onChange={(e) => setForm({
                                ...form,
                                password: e.target.value
                            })}
                        />

                        <button type="submit">Login</button>
                    </form>

                    <h3>Create New Account</h3>

                    <form onSubmit={register}>
                        <input
                            placeholder="Full Name"
                            required
                            value={form.name}
                            onChange={(e) => setForm({
                                ...form,
                                name: e.target.value
                            })}
                        />

                        <input
                            placeholder="Email"
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => setForm({
                                ...form,
                                email: e.target.value
                            })}
                        />

                        <input
                            placeholder="Password (minimum 6 characters)"
                            type="password"
                            minLength="6"
                            required
                            value={form.password}
                            onChange={(e) => setForm({
                                ...form,
                                password: e.target.value
                            })}
                        />

                        <input
                            placeholder="Department"
                            required
                            value={form.department}
                            onChange={(e) => setForm({
                                ...form,
                                department: e.target.value
                            })}
                        />

                        <button type="submit">Register</button>
                    </form>
                </section>
            )}

            {page === "add" && user && (
                <section className="form-container">
                    <h2>{editingId ? "Edit Skill" : "Add Your Skill"}</h2>

                    <form onSubmit={saveSkill}>
                        <input
                            placeholder="Skill Title"
                            required
                            value={skill.title}
                            onChange={(e) => setSkill({
                                ...skill,
                                title: e.target.value
                            })}
                        />

                        <input
                            placeholder="Category"
                            required
                            value={skill.category}
                            onChange={(e) => setSkill({
                                ...skill,
                                category: e.target.value
                            })}
                        />

                        <textarea
                            placeholder="Describe your skill"
                            required
                            value={skill.description}
                            onChange={(e) => setSkill({
                                ...skill,
                                description: e.target.value
                            })}
                        />

                        <select
                            value={skill.level}
                            onChange={(e) => setSkill({
                                ...skill,
                                level: e.target.value
                            })}
                        >
                            <option>Beginner</option>
                            <option>Intermediate</option>
                            <option>Advanced</option>
                        </select>

                        <button type="submit">
                            {editingId ? "Update Skill" : "Publish Skill"}
                        </button>
                    </form>
                </section>
            )}

            {page === "requests" && user && (
                <section className="content">
                    <h2>Learning Requests</h2>

                    {requests.map((request) => (
                        <div className="request-card" key={request._id}>
                            <h3>{request.skill?.title || "Skill"}</h3>

                            <p>
                                From: {request.sender?.name}
                            </p>

                            <p>
                                To: {request.receiver?.name}
                            </p>

                            <p>Status: <b>{request.status}</b></p>

                            {request.receiver?._id === user.id &&
                                request.status === "Pending" && (
                                <>
                                    <button onClick={() =>
                                        updateRequest(request._id, "Accepted")
                                    }>
                                        Accept
                                    </button>

                                    <button
                                        className="delete"
                                        onClick={() =>
                                            updateRequest(request._id, "Rejected")
                                        }
                                    >
                                        Reject
                                    </button>
                                </>
                            )}
                        </div>
                    ))}

                    {requests.length === 0 && (
                        <p>No learning requests yet.</p>
                    )}
                </section>
            )}

            <footer>
                <h3>SkillSwap</h3>
                <p>Learn Together. Grow Together.</p>
                <p>© 2026 SkillSwap Student Project</p>
            </footer>

        </div>
    );
}

export default App;