import User from "../models/User.js";
import { hashPassword, comparePassword, generateToken } from "../utils/hashing.js";

export const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            res.status(400);
            throw new Error("Please fill all fields");
        }

        const existEmail = await User.findOne({ email });
        if (existEmail) {
            res.status(400);
            throw new Error("Email already taken");
        }

        const existUsername = await User.findOne({ username });
        if (existUsername) {
            res.status(400);
            throw new Error("Username already taken");
        }

        const hashedPassword = await hashPassword(password);

        const user = await User.create({
            username,
            email,
            password: hashedPassword,
        });

        res.status(201).json({
            success: true,
            data: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                message: "Registered successfully"
            }
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400);
            throw new Error("Please provide email and password");
        }

        const user = await User.findOne({ email });

        if (!user) {
            res.status(401);
            throw new Error("Kindly enter correct email address");
        }

        if (user.accountStatus === "blocked") {
            res.status(403);
            throw new Error("Your account has been blocked");
        }

        if (await comparePassword(password, user.password)) {
            res.status(200).json({
                success: true,
                data: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    profileVisibility: user.profileVisibility,
                    accountStatus: user.accountStatus,
                    token: generateToken(user._id, user.role)
                }
            });
        } else {
            res.status(401);
            throw new Error("Password entered is incorrect. Kindly enter the correct password");
        }
    } catch (error) {
        next(error);
    }
};
