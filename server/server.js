const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5174"
}));

app.use(express.json());

// USER MODEL
const User = mongoose.model("User", new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    department: { type: String, required: true }
}, { timestamps: true }));

// SKILL MODEL
const Skill = mongoose.model("Skill", new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    level: {
        type: String,
        enum: ["Beginner", "Intermediate", "Advanced"],
        default: "Beginner"
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true }));

// REQUEST MODEL
const Request = mongoose.model("Request", new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    skill: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Skill",
        required: true
    },
    message: String,
    status: {
        type: String,
        enum: ["Pending", "Accepted", "Rejected"],
        default: "Pending"
    }
}, { timestamps: true }));

// AUTHENTICATION MIDDLEWARE
function protect(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Please login first"
        });
    }

    try {
        const token = header.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.userId = decoded.id;
        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid token"
        });
    }
}

// HOME
app.get("/", (req, res) => {
    res.send("SkillSwap Backend is Running");
});

// REGISTER
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password, department } = req.body;

        if (!name || !email || !password || !department) {
            return res.status(400).json({
                message: "Fill all fields"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must contain at least 6 characters"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existing = await User.findOne({
            email: normalizedEmail
        });

        if (existing) {
            return res.status(400).json({
                message: "Email already exists"
            });
        }

        const hashed = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email: normalizedEmail,
            password: hashed,
            department
        });

        const token = jwt.sign(
            { id: user._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                department: user.department
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase();
        const { password } = req.body;

        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            { id: user._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                department: user.department
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET SKILLS
app.get("/api/skills", async (req, res) => {
    try {
        const search = req.query.search || "";

        const skills = await Skill.find({
            $or: [
                { title: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } }
            ]
        })
        .populate("owner", "name department")
        .sort({ createdAt: -1 });

        res.json(skills);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ADD SKILL
app.post("/api/skills", protect, async (req, res) => {
    try {
        const { title, category, description, level } = req.body;

        if (!title || !category || !description) {
            return res.status(400).json({
                message: "Fill all skill fields"
            });
        }

        const skill = await Skill.create({
            title,
            category,
            description,
            level,
            owner: req.userId
        });

        res.status(201).json(skill);

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// EDIT SKILL
app.put("/api/skills/:id", protect, async (req, res) => {
    try {
        const skill = await Skill.findOne({
            _id: req.params.id,
            owner: req.userId
        });

        if (!skill) {
            return res.status(404).json({
                message: "Skill not found"
            });
        }

        const { title, category, description, level } = req.body;

        if (title !== undefined) skill.title = title;
        if (category !== undefined) skill.category = category;
        if (description !== undefined) skill.description = description;
        if (level !== undefined) skill.level = level;

        await skill.save();

        res.json(skill);

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE SKILL
app.delete("/api/skills/:id", protect, async (req, res) => {
    try {
        const skill = await Skill.findOneAndDelete({
            _id: req.params.id,
            owner: req.userId
        });

        if (!skill) {
            return res.status(404).json({
                message: "Skill not found"
            });
        }

        res.json({ message: "Skill deleted successfully" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// SEND LEARNING REQUEST
app.post("/api/requests", protect, async (req, res) => {
    try {
        const { skillId, message } = req.body;

        const skill = await Skill.findById(skillId);

        if (!skill) {
            return res.status(404).json({
                message: "Skill not found"
            });
        }

        if (skill.owner.toString() === req.userId) {
            return res.status(400).json({
                message: "You cannot request your own skill"
            });
        }

        const existing = await Request.findOne({
            sender: req.userId,
            skill: skillId,
            status: "Pending"
        });

        if (existing) {
            return res.status(400).json({
                message: "Pending request already exists"
            });
        }

        const request = await Request.create({
            sender: req.userId,
            receiver: skill.owner,
            skill: skillId,
            message: message || ""
        });

        res.status(201).json(request);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET REQUESTS
app.get("/api/requests", protect, async (req, res) => {
    try {
        const requests = await Request.find({
            $or: [
                { sender: req.userId },
                { receiver: req.userId }
            ]
        })
        .populate("sender", "name email")
        .populate("receiver", "name email")
        .populate("skill", "title category")
        .sort({ createdAt: -1 });

        res.json(requests);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ACCEPT OR REJECT
app.patch("/api/requests/:id", protect, async (req, res) => {
    try {
        const { status } = req.body;

        if (!["Accepted", "Rejected"].includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        const request = await Request.findOne({
            _id: req.params.id,
            receiver: req.userId
        });

        if (!request) {
            return res.status(404).json({
                message: "Request not found"
            });
        }

        if (request.status !== "Pending") {
            return res.status(400).json({
                message: "Request already processed"
            });
        }

        request.status = status;
        await request.save();

        res.json(request);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// START SERVER
const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB Connected Successfully");

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Database connection error:", error.message);
        process.exit(1);
    }
}

startServer();