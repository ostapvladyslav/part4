const blogsRouter = require('express').Router();
const { userExtractor } = require('../utils/middleware');
const Blog = require('../models/blog');

blogsRouter.get('/', async (req, res) => {
  const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 });

  res.json(blogs);
});

blogsRouter.post('/', userExtractor, async (req, res) => {
  const { title, author, url, likes } = req.body;

  const user = req.user;

  const blog = await new Blog({
    title,
    author,
    url,
    likes: likes ? likes : 0,
    user: req.user,
  }).populate('user', { username: 1, name: 1 });

  if (!user) {
    return res.status(401).json({ error: 'operation not permitted' });
  }

  const savedBlog = await blog.save();

  user.blogs = user.blogs.concat(savedBlog._id);
  await user.save();

  res.status(201).json(savedBlog);
});

blogsRouter.get('/:id', async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (blog) {
    res.json(blog);
  } else {
    res.status(404).end();
  }
});

blogsRouter.delete('/:id', userExtractor, async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  const user = req.user;
  if (!user || !blog || blog.user.toString() !== user.id.toString()) {
    return res.status(401).json({ error: 'operation not permitted' });
  }

  user.blogs = user.blogs.filter((b) => b.toString() !== blog.id.toString());

  await user.save();
  await blog.remove();

  res.status(204).end();
});

blogsRouter.put('/:id', async (req, res) => {
  const { title, author, url, likes, user } = req.body;

  const updatedBlog = await Blog.findByIdAndUpdate(
    req.params.id,
    { title, url, likes, author, user: user.id },
    { new: true, runValidators: true, context: 'query' }
  ).populate('user', { username: 1, name: 1 });
  res.json(updatedBlog);
});

module.exports = blogsRouter;
