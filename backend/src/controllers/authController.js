import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import { validateEmail, validatePassword, validateUsername } from '../utils/validation.js';

// Sign up
export const signup = async (req, res) => {
  try {
    const { email, username, password, fullName, dateOfBirth } = req.body;

    // Validation
    if (!email || !username || !password || !fullName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' 
      });
    }

    if (!validateUsername(username)) {
      return res.status(400).json({ 
        error: 'Username must be 3-30 characters, alphanumeric and underscores only' 
      });
    }

    // Check if email or username exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email or username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await db.query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username, created_at',
      [email, username, hashedPassword]
    );

    const userId = userResult.rows[0].id;

    // Create profile
    await db.query(
      'INSERT INTO profiles (user_id, full_name) VALUES ($1, $2)',
      [userId, fullName]
    );

    // Generate JWT
    const token = jwt.sign(
      { id: userId, email, username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: userResult.rows[0]
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const userResult = await db.query(
      'SELECT id, email, username, password_hash, created_at FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const userResult = await db.query(
      'SELECT u.id, u.email, u.username, u.created_at, p.full_name, p.bio, p.location, p.profile_picture_url, p.cover_image_url FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(userResult.rows[0]);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout
export const logout = (req, res) => {
  res.json({ message: 'Logged out successfully' });
};
