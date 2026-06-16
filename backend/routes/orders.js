const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const router = express.Router();

const deliveryFee = 2;
const productsPath = path.join(__dirname, '../../data/products.json');
const ordersPath = path.join(__dirname, '../../data/orders.json');

const readJsonFile = async (filePath, fallback = []) => {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
};

const validateOrderPayload = (payload) => {
  const requiredFields = ['customerName', 'email', 'phone', 'address', 'products'];

  for (const field of requiredFields) {
    if (!payload[field]) {
      const error = new Error(`${field} is required`);
      error.statusCode = 400;
      throw error;
    }
  }

  if (!Array.isArray(payload.products) || payload.products.length === 0) {
    const error = new Error('products must be a non-empty array');
    error.statusCode = 400;
    throw error;
  }

  if (payload.paymentMethod && payload.paymentMethod !== 'COD') {
    const error = new Error('paymentMethod must be COD');
    error.statusCode = 400;
    throw error;
  }
};

router.post('/', async (req, res, next) => {
  try {
    validateOrderPayload(req.body);

    const [productCatalog, orders] = await Promise.all([
      readJsonFile(productsPath, []),
      readJsonFile(ordersPath, [])
    ]);

    const selectedProducts = req.body.products.map((item) => {
      const product = productCatalog.find((entry) => entry.id === item.id);

      if (!product) {
        const error = new Error(`Invalid product id: ${item.id}`);
        error.statusCode = 400;
        throw error;
      }

      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        const error = new Error(`Invalid quantity for product id: ${item.id}`);
        error.statusCode = 400;
        throw error;
      }

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity,
        subtotal: product.price * quantity
      };
    });

    const productsTotal = selectedProducts.reduce((sum, item) => sum + item.subtotal, 0);
    const total = productsTotal + deliveryFee;

    const order = {
      id: `ord-${Date.now()}`,
      customerName: req.body.customerName.trim(),
      email: req.body.email.trim(),
      phone: req.body.phone.trim(),
      address: req.body.address.trim(),
      products: selectedProducts,
      total,
      deliveryFee,
      createdAt: new Date().toISOString(),
      paymentMethod: 'COD'
    };

    orders.push(order);
    await fs.writeFile(ordersPath, JSON.stringify(orders, null, 2));

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const orders = await readJsonFile(ordersPath, []);
    const order = orders.find((entry) => entry.id === req.params.id);

    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
