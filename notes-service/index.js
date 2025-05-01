require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'notes_app_db',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

pool.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
  } else {
    console.log('Connected to database successfully');
  }
});

// Middleware to authenticate JWT token
const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization'];
  console.log('Authorization header:', token); // Debug
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    console.log('Decoded JWT:', decoded); // Debug
    req.userId = decoded.id;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    res.status(401).json({ error: 'Invalid token', details: error.message });
  }
};

// Note routes
app.use('/api/notes', express.Router()
  // Create a new note
  .post('/notes', authMiddleware, [
    body('title').isLength({ min: 1 }).withMessage('Title must not be empty').trim(),
    body('content').isLength({ min: 1 }).withMessage('Content must not be empty').trim(),
  ], async (req, res) => {
    console.log('Create note request:', req.body, 'User ID:', req.userId); // Debug
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array()); // Debug
      return res.status(400).json({ errors: errors.array() });
    }
    const { title, content } = req.body;
    try {
      // Verify user exists
      const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [req.userId]);
      if (userCheck.rowCount === 0) {
        console.log('User not found:', req.userId); // Debug
        return res.status(403).json({ error: 'User not found' });
      }
      const result = await pool.query(
        'INSERT INTO notes (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
        [req.userId, title, content]
      );
      console.log('Note created:', result.rows[0]); // Debug
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create note error:', error.message, error.stack); // Debug
      res.status(500).json({ error: 'Failed to create note', details: error.message });
    }
  })
  // Get all active notes for the user
  .get('/notes', authMiddleware, async (req, res) => {
    console.log('Fetch notes request for user:', req.userId); // Debug
    try {
      const result = await pool.query(
        'SELECT * FROM notes WHERE user_id = $1 ORDER BY updated_at DESC',
        [req.userId]
      );
      console.log('Notes fetched:', result.rows); // Debug
      res.json(result.rows);
    } catch (error) {
      console.error('Fetch notes error:', error.message, error.stack); // Debug
      res.status(500).json({ error: 'Failed to fetch notes', details: error.message });
    }
  })
  // Get all trashed notes for the user
  .get('/trashed-notes', authMiddleware, async (req, res) => {
    console.log('Fetch trashed notes request for user:', req.userId); // Debug
    try {
      const result = await pool.query(
        'SELECT * FROM trashed_notes WHERE user_id = $1 ORDER BY trashed_at DESC',
        [req.userId]
      );
      console.log('Trashed notes fetched:', result.rows); // Debug
      res.json(result.rows);
    } catch (error) {
      console.error('Fetch trashed notes error:', error.message, error.stack); // Debug
      res.status(500).json({ error: 'Failed to fetch trashed notes', details: error.message });
    }
  })
  // Move note to trash
  .delete('/notes/:id', authMiddleware, async (req, res) => {
    const noteId = parseInt(req.params.id, 10);
    console.log('Move to trash request: Note ID:', noteId, 'User ID:', req.userId); // Debug
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const noteResult = await client.query(
        'SELECT * FROM notes WHERE id = $1 AND user_id = $2',
        [noteId, req.userId]
      );
      if (noteResult.rowCount === 0) {
        await client.query('ROLLBACK');
        console.log('Note not found or not owned:', noteId); // Debug
        return res.status(404).json({ error: 'Note not found or not owned by user' });
      }
      const note = noteResult.rows[0];
      await client.query(
        'INSERT INTO trashed_notes (note_id, user_id, title, content, trashed_at, original_updated_at) VALUES ($1, $2, $3, $4, NOW(), $5)',
        [note.id, note.user_id, note.title, note.content, note.updated_at]
      );
      await client.query(
        'DELETE FROM notes WHERE id = $1 AND user_id = $2',
        [noteId, req.userId]
      );
      await client.query('COMMIT');
      console.log('Note moved to trash:', noteId); // Debug
      res.status(204).send();
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Move to trash error:', error.message, error.stack); // Debug
      res.status(500).json({ error: 'Failed to move note to trash', details: error.message });
    } finally {
      client.release();
    }
  })
  // Restore note from trash
  .post('/trashed-notes/:id/restore', authMiddleware, async (req, res) => {
    const trashedNoteId = parseInt(req.params.id, 10);
    console.log('Restore note request: Trashed Note ID:', trashedNoteId, 'User ID:', req.userId); // Debug
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const trashedResult = await client.query(
        'SELECT * FROM trashed_notes WHERE id = $1 AND user_id = $2',
        [trashedNoteId, req.userId]
      );
      if (trashedResult.rowCount === 0) {
        await client.query('ROLLBACK');
        console.log('Trashed note not found:', trashedNoteId); // Debug
        return res.status(404).json({ error: 'Trashed note not found or not owned by user' });
      }
      const trashedNote = trashedResult.rows[0];
      const restoredResult = await client.query(
        'INSERT INTO notes (user_id, title, content, updated_at) VALUES ($1, $2, $3, COALESCE($4, NOW())) RETURNING *',
        [trashedNote.user_id, trashedNote.title, trashedNote.content, trashedNote.original_updated_at]
      );
      await client.query(
        'DELETE FROM trashed_notes WHERE id = $1 AND user_id = $2',
        [trashedNoteId, req.userId]
      );
      await client.query('COMMIT');
      console.log('Note restored:', restoredResult.rows[0]); // Debug
      res.status(200).json(restoredResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Restore note error:', error.message, error.stack); // Debug
      res.status(500).json({ error: 'Failed to restore note', details: error.message });
    } finally {
      client.release();
    }
  })
  // Permanently delete note from trash
  .delete('/trashed-notes/:id', authMiddleware, async (req, res) => {
    const trashedNoteId = parseInt(req.params.id, 10);
    console.log('Permanent delete request: Trashed Note ID:', trashedNoteId, 'User ID:', req.userId); // Debug
    try {
      const result = await pool.query(
        'DELETE FROM trashed_notes WHERE id = $1 AND user_id = $2 RETURNING *',
        [trashedNoteId, req.userId]
      );
      if (result.rowCount === 0) {
        console.log('Trashed note not found:', trashedNoteId); // Debug
        return res.status(404).json({ error: 'Trashed note not found or not owned by user' });
      }
      console.log('Trashed note deleted:', trashedNoteId); // Debug
      res.status(204).send();
    } catch (error) {
      console.error('Permanent delete error:', error.message, error.stack); // Debug
      res.status(500).json({ error: 'Failed to permanently delete note', details: error.message });
    }
  })
  // Update an existing note
  .put('/notes/:id', authMiddleware, [
    body('title').isLength({ min: 1 }).withMessage('Title must not be empty').trim(),
    body('content').isLength({ min: 1 }).withMessage('Content must not be empty').trim(),
  ], async (req, res) => {
    console.log('Update note request:', req.body, 'Note ID:', req.params.id, 'User ID:', req.userId); // Debug
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array()); // Debug
      return res.status(400).json({ errors: errors.array() });
    }
    const noteId = parseInt(req.params.id, 10);
    const { title, content } = req.body;
    try {
      const result = await pool.query(
        'UPDATE notes SET title = $1, content = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *',
        [title, content, noteId, req.userId]
      );
      if (result.rowCount === 0) {
        console.log('Note not found or not owned:', noteId); // Debug
        return res.status(404).json({ error: 'Note not found or not owned by user' });
      }
      console.log('Note updated:', result.rows[0]); // Debug
      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error('Update note error:', error.message, error.stack); // Debug
      res.status(500).json({ error: 'Failed to update note', details: error.message });
    }
  })
);

// Start HTTP server
const PORT = 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Notes Service running on port ${PORT}`);
});