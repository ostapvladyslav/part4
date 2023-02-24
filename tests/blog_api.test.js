const supertest = require('supertest');
const mongoose = require('mongoose');
const helper = require('./test_helper');
const app = require('../app');
const api = supertest(app);

const Blog = require('../models/blog');

beforeEach(async () => {
  await Blog.deleteMany({});
  await Blog.insertMany(helper.initialBlogs);
});

describe('when there is initially some blogs saved', () => {
  test('blogs are returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/);
  });

  test('all blogs are returned', async () => {
    // const res = await api.get('/api/blogs');
    const blogsAtStart = await helper.blogsInDb();

    expect(blogsAtStart).toHaveLength(helper.initialBlogs.length);
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
});

describe('viewing a specifig blog', () => {
  test('succeeds with a valid id', async () => {
    const blogsAtStart = await helper.blogsInDb();

    const blogToView = blogsAtStart[0];

    const resultBlog = await api
      .get(`/api/blogs/${blogToView.id}`)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    expect(resultBlog.body).toEqual(blogToView);
  });

  test('fails with 404 if blog does not exist', async () => {
    const validNonexistingId = await helper.nonExistingId();

    await api.get(`/api/blogs/${validNonexistingId}`).expect(404);
  });

  test('fails with 400 if id is invalid', async () => {
    const invalidId = 1234;

    await api.get(`/api/blogs/${invalidId}`).expect(400);
  });
});

describe('addition of a blog', () => {
  test('succeeds with valid data', async () => {
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

  test('fails with 400 if data is invalid', async () => {
    const invalidBlog = {
      author: 'V. Ostapchuk',
      likes: 50,
    };

    await api.post('/api/blogs').send(invalidBlog).expect(400);

    const blogsAtEnd = await helper.blogsInDb();
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length);
  });

  test('succeeds when blog missing "likes" property with 0 likes', async () => {
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
});

describe('deletion of blog', () => {
  test('succeeds with 204 if id is valid', async () => {
    const blogsAtStart = await helper.blogsInDb();
    const blogToDelete = blogsAtStart[0];

    await api.delete(`/api/blogs/${blogToDelete.id}`).expect(204);

    const blogsAtEnd = await helper.blogsInDb();
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length - 1);

    const titles = blogsAtEnd.map((r) => r.title);
    expect(titles).not.toContain(blogToDelete.title);
  });

  test('succeeds with 204 if blog does not exist', async () => {
    const validNonexistingId = await helper.nonExistingId();

    await api.delete(`/api/blogs/${validNonexistingId}`).expect(204);

    const blogsAtEnd = await helper.blogsInDb();
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length);
  });

  test('fails with 400 if id is invalid', async () => {
    const invalidId = 1234;

    await api.delete(`/api/blogs/${invalidId}`).expect(400);

    const blogsAtEnd = await helper.blogsInDb();
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length);
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});
