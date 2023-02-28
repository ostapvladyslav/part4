const supertest = require('supertest');
const mongoose = require('mongoose');
const {
  initialUsers,
  initialBlogs,
  blogsInDb,
  nonExistingId,
  usersInDb,
} = require('./test_helper');
const app = require('../app');
const api = supertest(app);

const Blog = require('../models/blog');
const User = require('../models/user');

let authHeader;

describe('blogs api', () => {
  beforeEach(async () => {
    await User.deleteMany({});

    const user = initialUsers[0];
    await api.post('/api/users').send(user);
    const res = await api.post('/api/login').send(user);
    authHeader = `Bearer ${res.body.token}`;
  });

  describe('when there is initially some blogs saved', () => {
    beforeEach(async () => {
      await Blog.deleteMany({});
      await Blog.insertMany(initialBlogs);
    });

    describe('blogs', () => {
      test('are returned as json', async () => {
        const result = await api
          .get('/api/blogs')
          .expect(200)
          .expect('Content-Type', /application\/json/);
        expect(result.body).toHaveLength(initialBlogs.length);
      });

      test('have "id" property instead of "_id"', async () => {
        const blogsAtStart = await blogsInDb();

        expect(blogsAtStart[0].id).toBeDefined();
        expect(blogsAtStart[0]._id).toBeUndefined();
      });
    });

    describe('viewing a specifig blog', () => {
      test('succeeds with 201 with valid id', async () => {
        const [blogToView] = await blogsInDb();

        const resultBlog = await api
          .get(`/api/blogs/${blogToView.id}`)
          .expect(200)
          .expect('Content-Type', /application\/json/);

        expect(resultBlog.body).toEqual(blogToView);
      });

      test('fails with 404 if blog does not exist', async () => {
        const validNonexistingId = await nonExistingId();

        await api.get(`/api/blogs/${validNonexistingId}`).expect(404);
      });

      test('fails with 400 if id is invalid', async () => {
        const invalidId = 1234;

        await api.get(`/api/blogs/${invalidId}`).expect(400);
      });
    });

    describe('addition of a blog', () => {
      test('succeeds with 201 with valid data', async () => {
        const newBlog = {
          title: 'Vladyslav Completes Fullstackopen Course',
          author: 'V. Ostapchuk',
          url: 'https://github.com/ostapvladyslav/Fullstackopen',
          likes: 5,
        };

        await api
          .post('/api/blogs')
          .set('Authorization', authHeader)
          .send(newBlog)
          .expect(201)
          .expect('Content-Type', /application\/json/);

        const blogsAtEnd = await blogsInDb();
        expect(blogsAtEnd).toHaveLength(initialBlogs.length + 1);

        const titles = blogsAtEnd.map((b) => b.title);
        expect(titles).toContainEqual(
          'Vladyslav Completes Fullstackopen Course'
        );
      });

      test('succeeds with 201 when blog missing "likes" property', async () => {
        const newBlog = {
          title: 'Vladyslav Completes Fullstackopen Course',
          author: 'V. Ostapchuk',
          url: 'https://github.com/ostapvladyslav/Fullstackopen',
        };

        await api
          .post('/api/blogs')
          .set('Authorization', authHeader)
          .send(newBlog)
          .expect(201)
          .expect('Content-Type', /application\/json/);

        const blogsAtEnd = await blogsInDb();
        expect(blogsAtEnd).toHaveLength(initialBlogs.length + 1);
        expect(blogsAtEnd[initialBlogs.length].likes).toBe(0);
      });

      test('fails with 400 if no title', async () => {
        const invalidBlog = {
          title: 'Vladyslav Completes Fullstackopen Course',
          url: 'https://github.com/ostapvladyslav/Fullstackopen',
          likes: 5,
        };

        await api
          .post('/api/blogs')
          .set('Authorization', authHeader)
          .send(invalidBlog)
          .expect(400)
          .expect('Content-Type', /application\/json/);
      });

      test('fails with 400 if no author', async () => {
        const invalidBlog = {
          author: 'V. Ostapchuk',
          likes: 50,
        };

        await api
          .post('/api/blogs')
          .set('Authorization', authHeader)
          .send(invalidBlog)
          .expect(400)
          .expect('Content-Type', /application\/json/);
      });

      test('fails with 400 if no token provided', async () => {
        const newBlog = {
          title: 'Vladyslav Completes Fullstackopen Course',
          author: 'V. Ostapchuk',
          url: 'https://github.com/ostapvladyslav/Fullstackopen',
          likes: 5,
        };

        const result = await api
          .post('/api/blogs')
          .send(newBlog)
          .expect(401)
          .expect('Content-Type', /application\/json/);

        expect(result.body.error).toContain('operation not permitted');
      });
    });
  });

  describe('modifying a blog', () => {
    let id;
    beforeEach(async () => {
      await Blog.deleteMany({});

      const newBlog = {
        title: 'Vladyslav Completes Fullstackopen Course',
        author: 'V. Ostapchuk',
        url: 'https://github.com/ostapvladyslav/Fullstackopen',
        likes: 5,
      };

      const result = await api
        .post('/api/blogs')
        .set('Authorization', authHeader)
        .send(newBlog);

      id = result.body.id;
    });

    describe('update of a blog', () => {
      test('succeeds with 200 with proper id', async () => {
        const [blogBefore] = await blogsInDb();

        const modifiedBlog = { ...blogBefore, title: 'Goto considered useful' };

        await api
          .put(`/api/blogs/${blogBefore.id}`)
          .send(modifiedBlog)
          .expect(200);

        const blogs = await blogsInDb();

        const titles = blogs.map((b) => b.title);
        expect(titles).toContain(modifiedBlog.title);
      });

      test('fails with 400 if data is invalid', async () => {
        const [blogBefore] = await blogsInDb();

        const modifiedBlog = { ...blogBefore, title: null };

        await api
          .put(`/api/blogs/${blogBefore.id}`)
          .send(modifiedBlog)
          .expect(400);

        const [blogAtEnd] = await blogsInDb();
        expect(blogAtEnd).toEqual(blogBefore);
      });

      test('succeeds with 200 if blog does not exist', async () => {
        const validNonexistingId = await nonExistingId();
        const [blogBefore] = await blogsInDb();
        const modifiedBlog = { ...blogBefore, title: 'Goto considered useful' };

        await api
          .put(`/api/blogs/${validNonexistingId}`)
          .send(modifiedBlog)
          .expect(200);

        const [blogAtEnd] = await blogsInDb();
        expect(blogAtEnd).toEqual(blogBefore);
      });

      test('fails with 400 if id is invalid', async () => {
        const invalidId = 1234;
        const [blogBefore] = await blogsInDb();
        const modifiedBlog = { ...blogBefore, title: 'Goto considered useful' };

        await api.get(`/api/blogs/${invalidId}`).send(modifiedBlog).expect(400);

        const [blogAtEnd] = await blogsInDb();
        expect(blogAtEnd).toEqual(blogBefore);
      });
    });

    describe('deletion of a blog', () => {
      test('succeeds with 204 by the creator', async () => {
        await api
          .delete(`/api/blogs/${id}`)
          .set('Authorization', authHeader)
          .expect(204);

        const blogsAtEnd = await blogsInDb();
        expect(blogsAtEnd).toHaveLength(0);
      });

      test('fails with 401 without valid token', async () => {
        await api.delete(`/api/blogs/${id}`).expect(401);

        const blogsAtEnd = await blogsInDb();
        expect(blogsAtEnd).toHaveLength(1);
      });

      test('fails with 401 if blog does not exist', async () => {
        const validNonexistingId = await nonExistingId();

        await api
          .delete(`/api/blogs/${validNonexistingId}`)
          .set('Authorization', authHeader)
          .expect(401);

        const blogsAtEnd = await blogsInDb();
        expect(blogsAtEnd).toHaveLength(1);
      });

      test('fails with 400 if id is invalid', async () => {
        const invalidId = 1234;

        await api
          .delete(`/api/blogs/${invalidId}`)
          .set('Authorization', authHeader)
          .expect(400);

        const blogsAtEnd = await blogsInDb();
        expect(blogsAtEnd).toHaveLength(1);
      });
    });
  });

  describe('creation of a user', () => {
    test('succeeds with 201 with fresh username', async () => {
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

      const users = await usersInDb();

      expect(users).toHaveLength(initialUsers.length + 1);
      const usernames = users.map((u) => u.username);
      expect(usernames).toContain(newUser.username);
    });

    test('fails with 400 if username is too short', async () => {
      const newUser = {
        username: 'Ad',
        name: 'Vladyslav Ostapchuk',
        password: 'vladpass',
      };

      const result = await api
        .post('/api/users')
        .send(newUser)
        .expect(400)
        .expect('Content-Type', /application\/json/);
      expect(result.body.error).toContain('Minimum length of username is 3');
    });

    test('fails with 400 if password is invalid', async () => {
      const newUser = {
        username: 'root',
        password: '12',
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
    });

    test('fails with 400 if username already taken', async () => {
      const newUser = initialUsers[0];

      const result = await api
        .post('/api/users')
        .send(newUser)
        .expect(400)
        .expect('Content-Type', /application\/json/);

      expect(result.body.error).toContain('expected `username` to be unique');
    });
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});
