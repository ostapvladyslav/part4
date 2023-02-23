const dummy = () => {
  return 1;
};

const totalLikes = (blogs) => {
  return blogs.reduce((sum, cur) => {
    return sum + cur.likes;
  }, 0);
};

const favoriteBlog = (blogs) => {
  const result = blogs.reduce((max, cur) => {
    return max.likes >= cur.likes ? max : cur;
  }, {});
  return {
    title: result.title,
    author: result.author,
    likes: result.likes,
  };
};

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
};
