const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const router = express.Router();
const productsPath = path.join(__dirname, '../../data/products.json');

router.get('/', async (req, res, next) => {
  try {
    const raw = await fs.readFile(productsPath, 'utf-8');
    res.json(JSON.parse(raw));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
