const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const checkAuth = require('../middleware/check-auth')

const Order = require('../../models/orders');
const Product = require('../../models/products');

router.get('/', checkAuth.requireAdmin, (req, res, next) => {
  Order.find()
    .select('-__v')
    .populate('productId', '-__v')
    .exec()
    .then(result => {
      res.status(200).json({
        count: result.length,
        orders: result.map(order => {
          return {
            orderId: order._id,
            product: order.productId,
            quantity: order.quantity,
            request: {
              type: 'GET',
              url: `http://localhost:3000/orders/${order._id}`
            }
          }
        })
      });
    })
    .catch(err => {
      res.status(500).json(err)
    });
})

router.post('/', checkAuth.requireLogin, (req, res, next) => {
  //product validation
  Product.findById(req.body.productId)
    .exec()
    .then(product => {
      if (!product) { //product not found
        return res.status(404).json({
          message: 'product not found'
        });
      }
      const order = new Order({
        quantity: req.body.quantity,
        productId: req.body.productId,
        createdBy: res.locals.userData.userId
      });
      console.log(order)
      return order.save()
    })
    .then(result => {
      res.status(201).json({
        message: "order saved",
        order: {
          _id: result._id,
          product: result.productId,
          quantity: result.quantity,
          createdBy: result.createdBy
        },
        request: {
          type: 'GET',
          url: `http://localhost:3000/orders/${result._id}`
        }
      });
    })
    .catch(err => {
      if (err.name === 'CastError') {
        res.status(500).json({ error: "Invalid product ID" });
      }
    })
})

router.get('/:orderId', checkAuth.requireLogin, (req, res, next) => {
  const id = req.params.orderId;
  Order.findById(id)
    .populate('productId', '-__v')
    .exec()
    .then(result => {
      if (!result) {
        return res.status(404).json({ message: 'Order not found' })
      }
      //check if logged in user created the order
      if (checkAuth.validateUser(res.locals.userData, result.createdBy)) {
        res.status(200).json({
          message: 'orders details',
          order: {
            product: result.productId,
            quantity: result.quantity,
            createdBy: result.createdBy
          },
          request: {
            type: 'GET',
            url: `http://localhost:3000/orders/${result._id}`
          }
        })
      } else {
        return res.status(401).json({
          message: 'You\'re not allowed to access this order'
        });
      }
    })
    .catch(err => {
      if (err.name === 'CastError') {
        res.status(500).json({ error: "Invalid order ID" });
      }
    })
})

router.delete('/:orderId', checkAuth.requireLogin, (req, res, next) => {
  const id = req.params.orderId;
  Order.findById(id)
    .exec()
    .then(result => {
      if (!result) return res.status(404).json({ message: "order not found" })
      if (checkAuth.validateUser(res.locals.userData, result.createdBy)) {
        Order.remove({ _id: id })
          .exec()
          .then(result => {
            res.status(200).json({
              message: `order ${id} deleted`,
              request: {
                type: 'POST',
                url: `http://localhost:3000/orders`,
                body: { productId: 'ID', quantity: 'Number' }
              }
            })
          })
          .catch(err => {
            console.log(err)
            res.status(500).json({ error: err })
          })
      } else {
        return res.status(401).json({
          message: 'You\'re not allowed to delete this order'
        });
      }
    })
    .catch(err => {
      if (err.name === 'CastError') {
        res.status(500).json({ error: "Invalid order ID" });
      }
    })
})

module.exports = router;