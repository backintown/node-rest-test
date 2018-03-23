require('dotenv').load();
const express = require('express');
const app = express();
const morgan = require('morgan')
const bodyParser = require('body-parser');
const mongoose = require('mongoose');


const productRoutes = require('./api/routes/products');
const orderRoutes = require('./api/routes/orders');
const userRoutes = require('./api/routes/user');

mongoose.connect(`mongodb://nodeshop:${process.env.MONGO_PW}@node-rest-shop-shard-00-00-mwuwk.mongodb.net:27017,node-rest-shop-shard-00-01-mwuwk.mongodb.net:27017,node-rest-shop-shard-00-02-mwuwk.mongodb.net:27017/rest-shop?ssl=true&replicaSet=node-rest-shop-shard-0&authSource=admin`)

app.use('/uploads', express.static('uploads'))
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/user', userRoutes);
//allow cors
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET')
    return res.status(200).json({});
  }
  next();
});

//error handling middleware
app.use((req, res, next) => {
  const error = new Error('app not found');
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message
    }
  });
});

//default 
app.use((req, res, next) => {
  res.status(200).json({
    message: 'it works'
  });
});

module.exports = app;