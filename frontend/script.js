const DELIVERY_FEE = 2;
const CART_KEY = 'ecommerce-store-cart';

const productsContainer = document.getElementById('products');
const cartItemsContainer = document.getElementById('cart-items');
const orderSummaryContainer = document.getElementById('order-summary');
const subtotalElement = document.getElementById('subtotal');
const deliveryElement = document.getElementById('delivery');
const totalElement = document.getElementById('total');
const checkoutForm = document.getElementById('checkout-form');
const statusMessage = document.getElementById('status-message');

let products = [];
let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');

const saveCart = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));

const getCartDetails = () => {
  const items = cart
    .map((entry) => {
      const product = products.find((item) => item.id === entry.id);
      if (!product) {
        return null;
      }

      return {
        ...product,
        quantity: entry.quantity,
        lineTotal: product.price * entry.quantity
      };
    })
    .filter(Boolean);

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = items.length > 0 ? DELIVERY_FEE : 0;

  return {
    items,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee
  };
};

const renderProducts = () => {
  productsContainer.innerHTML = products
    .map(
      (product) => `
        <article class="card">
          <img src="${product.image}" alt="${product.name}" loading="lazy" />
          <h3>${product.name}</h3>
          <p><strong>${product.price.toFixed(2)} JD</strong></p>
          <p>${product.description}</p>
          <p><strong>Usage:</strong> ${product.usage}</p>
          <button data-id="${product.id}">Add to Cart</button>
        </article>
      `
    )
    .join('');
};

const renderCart = () => {
  const details = getCartDetails();

  if (details.items.length === 0) {
    cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
    orderSummaryContainer.innerHTML = '<p>No items selected.</p>';
  } else {
    cartItemsContainer.innerHTML = details.items
      .map(
        (item) => `
          <div class="cart-row">
            <div>
              <strong>${item.name}</strong><br />
              ${item.price.toFixed(2)} JD × ${item.quantity} = ${item.lineTotal.toFixed(2)} JD
            </div>
            <div class="quantity-controls">
              <button class="small" data-action="decrease" data-id="${item.id}">-</button>
              <button class="small" data-action="increase" data-id="${item.id}">+</button>
              <button class="small danger" data-action="remove" data-id="${item.id}">Remove</button>
            </div>
          </div>
        `
      )
      .join('');

    orderSummaryContainer.innerHTML = `
      <ul>
        ${details.items
          .map((item) => `<li>${item.name} × ${item.quantity} = ${item.lineTotal.toFixed(2)} JD</li>`)
          .join('')}
      </ul>
      <p>Subtotal: ${details.subtotal.toFixed(2)} JD</p>
      <p>Delivery: ${details.deliveryFee.toFixed(2)} JD</p>
      <p><strong>Total: ${details.total.toFixed(2)} JD</strong></p>
    `;
  }

  subtotalElement.textContent = details.subtotal.toFixed(2);
  deliveryElement.textContent = details.deliveryFee.toFixed(2);
  totalElement.textContent = details.total.toFixed(2);
};

const addToCart = (id) => {
  const existing = cart.find((item) => item.id === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id, quantity: 1 });
  }
  saveCart();
  renderCart();
};

const updateQuantity = (id, change) => {
  const item = cart.find((entry) => entry.id === id);
  if (!item) {
    return;
  }

  item.quantity += change;

  if (item.quantity <= 0) {
    cart = cart.filter((entry) => entry.id !== id);
  }

  saveCart();
  renderCart();
};

const removeFromCart = (id) => {
  cart = cart.filter((entry) => entry.id !== id);
  saveCart();
  renderCart();
};

productsContainer.addEventListener('click', (event) => {
  const { id } = event.target.dataset;
  if (id) {
    addToCart(id);
  }
});

cartItemsContainer.addEventListener('click', (event) => {
  const { action, id } = event.target.dataset;
  if (!action || !id) {
    return;
  }

  if (action === 'increase') {
    updateQuantity(id, 1);
  }

  if (action === 'decrease') {
    updateQuantity(id, -1);
  }

  if (action === 'remove') {
    removeFromCart(id);
  }
});

checkoutForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const details = getCartDetails();
  if (details.items.length === 0) {
    statusMessage.textContent = 'Your cart is empty. Add products before checkout.';
    return;
  }

  const payload = {
    customerName: document.getElementById('customerName').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    address: document.getElementById('address').value,
    products: cart,
    paymentMethod: 'COD'
  };

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error || 'Order failed');
    }

    statusMessage.textContent = `Order placed successfully! Order ID: ${body.id}`;
    checkoutForm.reset();
    cart = [];
    saveCart();
    renderCart();
  } catch (error) {
    statusMessage.textContent = error.message;
  }
});

const init = async () => {
  try {
    const response = await fetch('/api/products');
    products = await response.json();
    renderProducts();
    renderCart();
  } catch (error) {
    productsContainer.innerHTML = `<p>Unable to load products: ${error.message}</p>`;
  }
};

init();
