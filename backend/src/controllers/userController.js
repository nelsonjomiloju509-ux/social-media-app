import db from '../config/database.js';

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT 
        u.id, u.email, u.username, u.created_at,
        p.full_name, p.bio, p.location, p.profile_picture_url, p.cover_image_url,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update profile
export const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, bio, location, profilePictureUrl, coverImageUrl } = req.body;

    // Check if user owns the profile
    if (req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Not authorized to update this profile' });
    }

    const result = await db.query(
      `UPDATE profiles 
       SET full_name = COALESCE($1, full_name), 
           bio = COALESCE($2, bio),
           location = COALESCE($3, location),
           profile_picture_url = COALESCE($4, profile_picture_url),
           cover_image_url = COALESCE($5, cover_image_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $6
       RETURNING *`,
      [fullName, bio, location, profilePictureUrl, coverImageUrl, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ message: 'Profile updated successfully', profile: result.rows[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user posts
export const getUserPosts = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const result = await db.query(
      `SELECT p.*, u.username, pr.full_name, pr.profile_picture_url
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN profiles pr ON u.id = pr.user_id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get followers
export const getFollowers = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT u.id, u.username, p.full_name, p.profile_picture_url
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE f.following_id = $1
       ORDER BY f.created_at DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get following
export const getFollowing = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT u.id, u.username, p.full_name, p.profile_picture_url
       FROM follows f
       JOIN users u ON f.following_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE f.follower_id = $1
       ORDER BY f.created_at DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
