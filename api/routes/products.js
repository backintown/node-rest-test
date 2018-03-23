const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const checkAuth = require('../middleware/check-auth')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${new Date().toISOString()}${file.originalname}`)
  }
});
const fileFilter = (req, file, cb) => {
  //reject none image files
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(null, false)
  }
}
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 //5MB
  }
});

const Product = require('../../models/products')

router.get('/', (req, res, next) => {
  Product.find()
    .select('-__v') //remove __v
    .exec()
    .then(results => {
      const response = {
        count: results.length,
        products: results.map(product => {
          return {
            name: product.name,
            price: product.price,
            productImage: product.productImage,
            _id: product._id,
            request: {
              type: 'GET',
              url: `http://localhost:3000/products/${product._id}`
            }
          }
        })
      };
      res.status(200).json(response);
    })
    .catch(err => {
      res.status(500).json({ error: err })
    })
});

router.post('/', checkAuth.requireAdmin, upload.single('productImage'), (req, res, next) => {
  console.log(req.file)
  const product = new Product({
    name: req.body.name,
    price: req.body.price,
    productImage: req.file.path
  });
  product.save()
    .then(result => {
      console.log(result)
      res.status(201).json({
        message: 'created product',
        createdProduct: {
          name: result.name,
          price: result.price,
          _id: result._id,
          productImage: result.productImage,
          request: {
            type: 'GET',
            url: `http://localhost:3000/products/${result._id}`
          }
        }
      });
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ err })
    });
});

router.get('/:productId', (req, res, next) => {
  const id = req.params.productId;
  Product.findById(id)
    .select('-__v')
    .exec()
    .then(result => {
      if (result) {
        console.log(result);
        res.status(200).json({
          message: 'created product',
          createdProduct: {
            name: result.name,
            price: result.price,
            _id: result._id,
            productImage: result.productImage,
            request: {
              type: 'GET',
              url: `http://localhost:3000/products/${result._id}`
            }
          }
        });
      } else {
        res.status(404).json({ message: 'no product found' })
      }
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({ error: err });
    });
})

router.patch('/:productId', checkAuth.requireAdmin, upload.single('productImage'), (req, res, next) => {
  const id = req.params.productId;
  req.body.productImage = req.file.path //put file image into body to update
  Product.findByIdAndUpdate(id, req.body)
    .select('-__v')
    .exec()
    .then(result => {
      if (result) {
        console.log(req.body)
        if (result.productImage) { //result is not updated version so we can use it to find the old image path
          //if there's an old image remove it if it exists
          if (fs.existsSync(`./${result.productImage}`)) {
            fs.unlinkSync(`./${result.productImage}`);
            console.log('image removed')
          }
        }
        res.status(201).json({
          message: `${result._id} ${result.name} updated`,
          updatedProduct: {
            name: req.body.name,
            price: req.body.price,
            _id: id,
            productImage: req.body.productImage
          },
          request: {
            type: 'GET',
            url: `http://localhost:3000/products/${result._id}`
          }
        })
      } else {
        res.status(404).json({ err: 'product not found' });
      }
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ err: 'Invalid product ID' });
    });
})

router.delete('/:productId', checkAuth.requireAdmin, (req, res, next) => {
  const id = req.params.productId;
  Product.findById(id)
    .exec()
    .then(result => {
      if (result.productImage) {
        //if there's an old image remove it from storage if it exists
        if (fs.existsSync(`./${result.productImage}`)) {
          fs.unlinkSync(`./${result.productImage}`);
          console.log('image removed')
        }
      }
      //remove from db
      Product.remove({ _id: id })
        .exec()
        .then(result => {
          res.status(200).json({
            message: `${id} deleted`,
          })
        })
        .catch(err => {
          console.log(err)
          res.status(500).json({ error: err })
        })
    })
    .catch(err => {
      console.log(err)
      res.status(500).json({ error: err })
    })
})

module.exports = router;