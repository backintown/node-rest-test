const app = require('./app');

const port = process.env.PORT || 3000;

app.listen(port, process.env.IP, () => {
  console.log(`listening on port ${port}`);
});