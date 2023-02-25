const supertest = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const helper = require('./test_helper');
const app = require('../app');
const api = supertest(app);

const Blog = require('../models/blog');
const User = require('../models/user');

describe('when there is initially some blogs saved', () => {
  beforeEach(async () => {
    await Blog.deleteMany({});
    await Blog.insertMany(helper.initialBlogs);
  });

  describe('then', () => {
    test('blogs are returned as json', async () => {
      await api
        .get('/api/blogs')
        .expect(200)
        .expect('Content-Type', /application\/json/);
    });

    test('all blogs are returned', async () => {
      const blogsAtStart = await helper.blogsInDb();

      expect(blogsAtStart).toHaveLength(helper.initialBlogs.length);
    });

    test('a specific blog is within the returned blogs', async () => {
      const blogsAtStart = await helper.blogsInDb();

      const titles = blogsAtStart.map((b) => b.title);
      expect(titles).toContainEqual('React patterns');
    });

    test('blogs have "id" property instead of "_id"', async () => {
      const blogsAtStart = await helper.blogsInDb();

      expect(blogsAtStart[0].id).toBeDefined();
      expect(blogsAtStart[0]._id).toBeUndefined();
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
      const blogsAtStart = await helper.blogsInDb();
      const invalidBlog = {
        author: 'V. Ostapchuk',
        likes: 50,
      };

      await api.post('/api/blogs').send(invalidBlog);

      const blogsAtEnd = await helper.blogsInDb();
      expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length);
      expect(blogsAtEnd).toEqual(blogsAtStart);
    });

    test('succeeds when blog missing "likes" property', async () => {
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

      const titles = blogsAtEnd.map((b) => b.title);
      expect(titles).not.toContain(blogToDelete.title);
    });

    test('succeeds with 204 if blog does not exist', async () => {
      const validNonexistingId = await helper.nonExistingId();

      await api.delete(`/api/blogs/${validNonexistingId}`).expect(204);

      const blogsAtEnd = await helper.blogsInDb();
      expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length);
    });

    test('fails with 400 if id is invalid', async () => {
      const blogsAtStart = await helper.blogsInDb();
      const invalidId = 1234;

      await api.delete(`/api/blogs/${invalidId}`).expect(400);

      const blogsAtEnd = await helper.blogsInDb();
      expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length);
      expect(blogsAtEnd).toEqual(blogsAtStart);
    });
  });

  describe('update of a blog', () => {
    test('succeeds with valid data', async () => {
      const blogsAtStart = await helper.blogsInDb();
      const blogToUpdate = blogsAtStart[0];

      const newBlog = {
        title: 'Vladyslav Completes Fullstackopen Course',
        author: 'V. Ostapchuk',
        url: 'https://github.com/ostapvladyslav/Fullstackopen',
        likes: 5,
      };

      await api
        .put(`/api/blogs/${blogToUpdate.id}`)
        .send(newBlog)
        .expect(200)
        .expect('Content-Type', /application\/json/);

      const blogsAtEnd = await helper.blogsInDb();
      expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length);
      const titles = blogsAtEnd.map((b) => b.title);
      expect(titles).toContainEqual('Vladyslav Completes Fullstackopen Course');
    });

    test('fails with 400 if data is invalid', async () => {
      const blogsAtStart = await helper.blogsInDb();
      const blogToUpdate = blogsAtStart[0];

      const invalidBlog = {
        likes: null,
      };

      await api
        .put(`/api/blogs/${blogToUpdate.id}`)
        .send(invalidBlog)
        .expect(400);

      const blogsAtEnd = await helper.blogsInDb();
      expect(blogsAtEnd).toEqual(blogsAtStart);
    });

    test('succeeds with 200 if blog does not exist', async () => {
      const validNonexistingId = await helper.nonExistingId();
      const blogsAtStart = await helper.blogsInDb();
      const newBlog = {
        title: 'Vladyslav Completes Fullstackopen Course',
        author: 'V. Ostapchuk',
        url: 'https://github.com/ostapvladyslav/Fullstackopen',
        likes: 5,
      };

      await api
        .put(`/api/blogs/${validNonexistingId}`)
        .send(newBlog)
        .expect(200);

      const blogsAtEnd = await helper.blogsInDb();
      expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length);
      expect(blogsAtEnd).toEqual(blogsAtStart);
    });

    test('fails with 400 if id is invalid', async () => {
      const invalidId = 1234;
      const blogsAtStart = helper.blogsInDb();

      const newBlog = {
        title: 'Vladyslav Completes Fullstackopen Course',
        author: 'V. Ostapchuk',
        url: 'https://github.com/ostapvladyslav/Fullstackopen',
        likes: 5,
      };

      await api.get(`/api/blogs/${invalidId}`).send(newBlog).expect(400);

      const blogsAtEnd = helper.blogsInDb();
      expect(blogsAtEnd).toEqual(blogsAtStart);
    });
  });
});

describe('when there is initially one user in db', () => {
  beforeEach(async () => {
    await User.deleteMany({});

    const passwordHash = await bcrypt.hash('sekret', 10);
    const user = new User({ username: 'root', passwordHash });

    await user.save();
  });

  describe('creation', () => {
    test('succeeds with a fresh username', async () => {
      const usersAtStart = await helper.usersInDb();

      const newUser = {
        username: 'vladyslav',
        name: 'Vladyslav Ostapchuk',
        password: 'vladpass',
      };

      await api
        .post('/api/users')
        .send(newUser)
        .expect(201)
        .expect('Content-Type', /application\/json/);

      const usersAtEnd = await helper.usersInDb();
      expect(usersAtEnd).toHaveLength(usersAtStart.length + 1);

      const usernames = usersAtEnd.map((u) => u.username);
      expect(usernames).toContain(newUser.username);
    });

    test('fails with 400 if username already taken', async () => {
      const usersAtStart = await helper.usersInDb();

      const newUser = {
        username: 'root',
        name: 'Vladyslav Ostapchuk',
        password: 'vladpass',
      };

      const result = await api
        .post('/api/users')
        .send(newUser)
        .expect(400)
        .expect('Content-Type', /application\/json/);

      expect(result.body.error).toContain('expected `username` to be unique');

      const usersAtEnd = await helper.usersInDb();
      expect(usersAtEnd).toEqual(usersAtStart);
    });

    test('fails with 400 if password is invalid', async () => {
      const usersAtStart = await helper.usersInDb();

      const newUser = {
        username: 'root',
        name: 'Vladyslav Ostapchuk',
      };

      const result = await api
        .post('/api/users')
        .send(newUser)
        .expect(400)
        .expect('Content-Type', /application\/json/);

      expect(result.body.error).toContain(
        'password must be at least 3 characters long'
      );

      const usersAtEnd = await helper.usersInDb();
      expect(usersAtEnd).toEqual(usersAtStart);
    });

    test('fails with 400 if data is invalid', async () => {
      const usersAtStart = await helper.usersInDb();

      const newUser = {
        name: 'Vladyslav Ostapchuk',
        password: 'vladpass',
      };

      const result = await api
        .post('/api/users')
        .send(newUser)
        .expect(400)
        .expect('Content-Type', /application\/json/);

      expect(result.body.error).toContain('User validation failed:');

      const usersAtEnd = await helper.usersInDb();
      expect(usersAtEnd).toEqual(usersAtStart);
    });
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});
