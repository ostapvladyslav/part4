const supertest = require('supertest');
const mongoose = require('mongoose');
const helper = require('./test_helper');
const app = require('../app');
const api = supertest(app);

const Blog = require('../models/blog');

beforeEach(async () => {
  await Blog.deleteMany({});

  for (let blog of helper.initialBlogs) {
    let blogObject = new Blog(blog);
    await blogObject.save();
  }
});

describe('blogs', () => {
  test('blogs are returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/);
  }, 100000);

  test('all blogs are returned', async () => {
    const res = await api.get('/api/blogs');

    expect(res.body).toHaveLength(helper.initialBlogs.length);
  });

  test('a specific blog is within the returned blogs', async () => {
    const res = await api.get('/api/blogs');

    const titles = res.body.map((r) => r.title);
    expect(titles).toContainEqual('React patterns');
  });

  test('blogs have "id" property instead of "_id"', async () => {
    const res = await api.get('/api/blogs');

    expect(res.body[0].id).toBeDefined();
    expect(res.body[0]._id).toBeUndefined();
  });

  test('a valid blog can be added', async () => {
    const newBlog = {
      title: 'Vladyslav Completes Fullstackopen Course',
      author: 'V. Ostapchuk',
      url: 'https://github.com/ostapvladyslav/Fullstackopen',
      likes: 5,
    };

    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const blogsAtEnd = await helper.blogsInDb();
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1);

    const titles = blogsAtEnd.map((r) => r.title);
    expect(titles).toContainEqual('Vladyslav Completes Fullstackopen Course');
  });

  test('blog missing "likes" property have 0 likes', async () => {
    const newBlogWithoutLikes = {
      title: 'Vladyslav Completes Fullstackopen Course',
      author: 'V. Ostapchuk',
      url: 'https://github.com/ostapvladyslav/Fullstackopen',
    };

    await api
      .post('/api/blogs')
      .send(newBlogWithoutLikes)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const blogsAtEnd = await helper.blogsInDb();
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1);
    expect(blogsAtEnd[helper.initialBlogs.length].likes).toBe(0);
  });

  test('blog without title or url is not added', async () => {
    const invalidBlog = {
      author: 'V. Ostapchuk',
      likes: 50,
    };

    await api.post('/api/blogs').send(invalidBlog).expect(400);

    const blogsAtEnd = await helper.blogsInDb();
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length);
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});
