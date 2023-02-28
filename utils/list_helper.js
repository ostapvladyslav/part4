const _ = require('lodash')
const dummy = () => {
  return 1
}

const totalLikes = (blogs) => {
  return blogs.reduce((sum, cur) => {
    return sum + cur.likes
  }, 0)
}

const favoriteBlog = (blogs) => {
  const result = blogs.reduce((max, cur) => {
    return max.likes >= cur.likes ? max : cur
  }, {})
  return {
    title: result.title,
    author: result.author,
    likes: result.likes,
  }
}

const mostBlogs = (blogs) => {
  if (blogs.length === 0) return {}
  const authors = blogs.map((blog) => blog.author)

  const countBlogs = authors.reduce(
    (acc, value) => ({
      ...acc,
      [value]: (acc[value] || 0) + 1,
    }),
    {}
  )

  let maxBlogs = { author: '', blogs: 0 }

  for (const [key, value] of Object.entries(countBlogs)) {
    if (value > maxBlogs.blogs) {
      maxBlogs = {
        author: key,
        blogs: value,
      }
    }
  }
  return maxBlogs
}

const mostLikes = (blogs) => {
  if (blogs.length === 0) return {}
  const mostLikes = _(blogs)
    .groupBy('author')
    .map((key, value) => ({
      author: value,
      likes: _.sumBy(key, 'likes'),
    }))
    .value()

  return mostLikes.reduce((max, cur) => {
    return max.likes > cur.likes ? max : cur
  })
}

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
  mostBlogs,
  mostLikes,
}
