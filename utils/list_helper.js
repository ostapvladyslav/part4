const dummy = () => {
  return 1;
};

const totalLikes = (blogs) => {
  return blogs.reduce((sum, cur) => {
    return sum + cur.likes;
  }, 0);
};

module.exports = {
  dummy,
  totalLikes,
};
