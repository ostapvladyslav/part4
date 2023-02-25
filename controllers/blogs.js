const config = require('../utils/config');
const blogsRouter = require('express').Router();
const Blog = require('../models/blog');
const User = require('../models/user');

const jwt = require('jsonwebtoken');

blogsRouter.get('/', async (req, res) => {
  const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 });
  res.json(blogs);
});

blogsRouter.post('/', async (req, res) => {
  const body = req.body;
  const decodedToken = jwt.verify(req.token, config.SECRET);
  if (!decodedToken.id) {
    return res.status(401).json({ error: 'token invalid' });
  }
  const user = await User.findById(decodedToken.id);

  const blog = new Blog({
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes,
    user: user._id,
  });

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

blogsRouter.delete('/:id', async (req, res) => {
  const decodedToken = jwt.verify(req.token, config.SECRET);
  if (!decodedToken.id) {
    return res.status(401).json({ error: 'token invalid' });
  }
  const blog = await Blog.findById(req.params.id);
  console.log(blog.user.toString());
  if (blog.user.toString() === decodedToken.id.toString()) {
    await Blog.deleteOne({ id: req.params.id });
    res.status(204).end();
  } else {
    res.status(401).json({ error: 'invalid user' });
  }
});

blogsRouter.put('/:id', async (req, res) => {
  const { title, author, url, likes } = req.body;

  const blog = {
    title,
    author,
    url,
    likes,
  };

  const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, blog, {
    new: true,
    runValidators: true,
    context: 'query',
  });

  res.json(updatedBlog);
});

module.exports = blogsRouter;
