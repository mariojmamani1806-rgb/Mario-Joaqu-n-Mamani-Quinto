const menuToggle = document.querySelector('#menuToggle');
const mainNav = document.querySelector('#mainNav');
const filterButtons = document.querySelectorAll('.filter');
const productCards = document.querySelectorAll('.product-card');
const addButtons = document.querySelectorAll('.add-button');
const cartStatus = document.querySelector('#cartStatus');
const toast = document.querySelector('#toast');
const orderItems = document.querySelector('#orderItems');
const orderCount = document.querySelector('#orderCount');
const subtotalValue = document.querySelector('#subtotalValue');
const deliveryValue = document.querySelector('#deliveryValue');
const totalValue = document.querySelector('#totalValue');
const checkoutForm = document.querySelector('#checkoutForm');
const addressFields = document.querySelector('#addressFields');
const checkoutMessage = document.querySelector('#checkoutMessage');

const cart = new Map();
const DELIVERY_FEE = 5;
let toastTimer;

document.querySelector('#year').textContent = new Date().getFullYear();

menuToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.textContent = isOpen ? '✕' : '☰';
});

mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.textContent = '☰';
  });
});

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    filterButtons.forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    const selectedCategory = button.dataset.filter;
    productCards.forEach(card => {
      card.hidden = selectedCategory !== 'todos' && card.dataset.category !== selectedCategory;
    });
  });
});

addButtons.forEach(button => {
  button.addEventListener('click', () => {
    const name = button.dataset.name;
    const price = Number(button.dataset.price);
    const item = cart.get(name) || { name, price, quantity: 0 };
    item.quantity += 1;
    cart.set(name, item);
    renderCart();
    checkoutMessage.hidden = true;
    showToast(`${name} agregado al pedido`);
  });
});

function money(amount) {
  return `S/ ${amount.toFixed(2)}`;
}

function getFulfillment() {
  return checkoutForm.querySelector('input[name="fulfillment"]:checked').value;
}

function renderCart() {
  const items = [...cart.values()];
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = count && getFulfillment() === 'delivery' ? DELIVERY_FEE : 0;
  const total = subtotal + delivery;

  cartStatus.innerHTML = count
    ? `Tu pedido está listo para revisar. <span>${count} producto${count === 1 ? '' : 's'} · ${money(total)}</span>`
    : `Tu pedido está esperando algo rico. <span>0 productos · S/ 0.00</span>`;
  orderCount.textContent = `${count} artículo${count === 1 ? '' : 's'}`;
  subtotalValue.textContent = money(subtotal);
  deliveryValue.textContent = money(delivery);
  totalValue.textContent = money(total);

  if (!items.length) {
    orderItems.innerHTML = '<div class="empty-cart"><span>🛍️</span><strong>Tu pedido está vacío</strong><p>Agrega algo rico del menú y aparecerá aquí.</p><a href="#menu">Ver menú ↓</a></div>';
    return;
  }

  orderItems.innerHTML = items.map(item => `
    <div class="order-item">
      <div class="order-item-art">${getProductEmoji(item.name)}</div>
      <div class="order-item-details"><strong>${escapeHTML(item.name)}</strong><small>${money(item.price)} c/u</small><button class="remove-item" type="button" data-remove="${escapeHTML(item.name)}">Eliminar</button></div>
      <div class="quantity-control" aria-label="Cantidad de ${escapeHTML(item.name)}">
        <button type="button" data-change="-1" data-name="${escapeHTML(item.name)}" aria-label="Quitar uno">−</button>
        <span>${item.quantity}</span>
        <button type="button" data-change="1" data-name="${escapeHTML(item.name)}" aria-label="Agregar uno">+</button>
      </div>
      <strong class="item-total">${money(item.price * item.quantity)}</strong>
    </div>`).join('');
}

function getProductEmoji(name) {
  const emojis = {
    'Latte de vainilla': '☕', Americano: '☕', Cappuccino: '☕', Cheesecake: '🍰',
    'Brownie de la casa': '🍫', 'Cookie de chocolate': '🍪', 'Frappe de mocha': '🧋',
    'Cold brew': '🧊', 'Iced matcha': '🍵', 'Roll de canela': '🥐',
    'Panini de la casa': '🥪', 'Iced latte': '🥤'
  };
  return emojis[name] || '☕';
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

orderItems.addEventListener('click', event => {
  const changeButton = event.target.closest('[data-change]');
  const removeButton = event.target.closest('[data-remove]');
  if (changeButton) {
    const item = cart.get(changeButton.dataset.name);
    if (!item) return;
    item.quantity += Number(changeButton.dataset.change);
    if (item.quantity <= 0) cart.delete(item.name);
    else cart.set(item.name, item);
    renderCart();
    checkoutMessage.hidden = true;
  }
  if (removeButton) {
    cart.delete(removeButton.dataset.remove);
    renderCart();
    checkoutMessage.hidden = true;
    showToast('Producto eliminado del pedido');
  }
});

checkoutForm.querySelectorAll('input[name="fulfillment"]').forEach(input => {
  input.addEventListener('change', () => {
    const isDelivery = getFulfillment() === 'delivery';
    addressFields.hidden = !isDelivery;
    checkoutForm.elements.address.required = isDelivery;
    renderCart();
  });
});

checkoutForm.addEventListener('submit', event => {
  event.preventDefault();
  checkoutMessage.hidden = true;
  if (!cart.size) {
    showToast('Agrega al menos un producto antes de continuar');
    document.querySelector('#menu').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  if (!checkoutForm.reportValidity()) return;

  const formData = new FormData(checkoutForm);
  const name = formData.get('customerName').trim();
  const subtotal = [...cart.values()].reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = getFulfillment() === 'delivery' ? DELIVERY_FEE : 0;
  const total = subtotal + delivery;
  const fulfillmentText = getFulfillment() === 'delivery' ? 'delivery' : 'recojo en tienda';
  checkoutMessage.innerHTML = `<strong>¡Todo listo, ${escapeHTML(name)}!</strong><p>Tu pedido de ${money(total)} está preparado para continuar con el pago con tarjeta (${fulfillmentText}).</p><p>Esta web es una demo: no se ha realizado ningún cobro. Para recibir pagos reales, el negocio debe integrar una pasarela segura como Culqi, Niubiz o Stripe.</p>`;
  checkoutMessage.hidden = false;
  checkoutMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
}

renderCart();
