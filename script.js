// ===== FIREBASE INIT =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile as fbUpdateProfile
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore,
  doc, getDoc, setDoc, updateDoc,
  collection, addDoc, getDocs,
  query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// 🔥 Remplacez par votre config Firebase
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_PROJECT.firebaseapp.com",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_PROJECT.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId: "VOTRE_APP_ID"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ===== PRODUCTS DATABASE =====
const allProducts = [
  { id: 1,  name: "iPhone 14 Pro Max",           brand: "apple",   price: 900000, type: "flagship", image: "https://images.unsplash.com/photo-1664478546389-6c03f5c0b9e0", specs: "A16 Bionic • 6.7\" Super Retina XDR" },
  { id: 2,  name: "Samsung Galaxy S23 Ultra",     brand: "samsung", price: 850000, type: "flagship", image: "https://images.unsplash.com/photo-1678911820864-e0c2d1a5cddb", specs: "Snapdragon 8 Gen 2 • 6.8\" Dynamic AMOLED" },
  { id: 3,  name: "Xiaomi Redmi Note 12 Pro+",    brand: "xiaomi",  price: 450000, type: "mid",      image: "https://images.unsplash.com/photo-1631729371254-42c2892f0e6e", specs: "Snapdragon 685 • 6.67\" AMOLED 120Hz" },
  { id: 4,  name: "Oppo Find X5 Pro",             brand: "oppo",    price: 600000, type: "flagship", image: "https://images.unsplash.com/photo-1629131726692-1accd0c53ce0", specs: "Snapdragon 8 Gen 1 • 6.7\" LTPO2 AMOLED" },
  { id: 5,  name: "iPhone 13",                    brand: "apple",   price: 700000, type: "mid",      image: "https://images.unsplash.com/photo-1592286927505-1def25e8672d", specs: "A15 Bionic • 6.1\" Super Retina XDR" },
  { id: 6,  name: "Samsung Galaxy A54",           brand: "samsung", price: 350000, type: "budget",   image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c", specs: "Exynos 1280 • 6.4\" Super AMOLED" },
  { id: 7,  name: "Xiaomi 13",                    brand: "xiaomi",  price: 550000, type: "flagship", image: "https://images.unsplash.com/photo-1511860648682-cd0bb473e3f0", specs: "Snapdragon 8 Gen 2 • 6.36\" LTPO AMOLED" },
  { id: 8,  name: "Oppo A77s",                    brand: "oppo",    price: 280000, type: "budget",   image: "https://images.unsplash.com/photo-1516321318423-f06f70db4397", specs: "MediaTek Helio G99 • 6.43\" AMOLED" },
  { id: 9,  name: "Samsung Galaxy Z Flip5",       brand: "samsung", price: 950000, type: "flagship", image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97", specs: "Snapdragon 8 Gen 2 • 6.7\" Dynamic AMOLED" },
  { id: 10, name: "Xiaomi Poco F4",               brand: "xiaomi",  price: 400000, type: "mid",      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9", specs: "Snapdragon 870 • 6.67\" AMOLED 120Hz" },
  { id: 11, name: "Oppo Reno 8",                  brand: "oppo",    price: 480000, type: "mid",      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30", specs: "Snapdragon 695 • 6.43\" AMOLED" },
  { id: 12, name: "iPhone SE",                    brand: "apple",   price: 500000, type: "budget",   image: "https://images.unsplash.com/photo-1572286927715-366f4c58e0a3", specs: "A15 Bionic • 4.7\" Retina" }
];

// ===== VARIABLES GLOBALES =====
let currentUser    = null;
let currentProfile = null;
let cart           = [];
let orders         = [];
let filteredProducts = [...allProducts];

// ===== INIT =====
function init() {
  displayProducts();
  updateCartCount();
  loadTheme();

  // Écoute l'état de connexion Firebase Auth
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadUserProfile(user.uid);
      await loadCart(user.uid);
      await loadOrders(user.uid);
      showProfileContent();
    } else {
      currentUser    = null;
      currentProfile = null;
      cart           = [];
      orders         = [];
      updateCartCount();
      document.getElementById('userDisplay').textContent = 'Connexion';
      document.getElementById('authContent').style.display   = 'block';
      document.getElementById('profileContent').style.display = 'none';
    }
  });
}

// ===== FIRESTORE : PROFIL =====
async function loadUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      currentProfile = snap.data();
    }
  } catch (err) {
    console.error("Erreur chargement profil:", err);
  }
}

async function saveUserProfile(uid, data) {
  try {
    await setDoc(doc(db, "users", uid), data, { merge: true });
    currentProfile = { ...currentProfile, ...data };
  } catch (err) {
    console.error("Erreur sauvegarde profil:", err);
  }
}

// ===== FIRESTORE : PANIER =====
async function loadCart(uid) {
  try {
    const snap = await getDoc(doc(db, "carts", uid));
    cart = snap.exists() ? (snap.data().items || []) : [];
    updateCartCount();
  } catch (err) {
    console.error("Erreur chargement panier:", err);
  }
}

async function saveCart() {
  if (!currentUser) return;
  try {
    await setDoc(doc(db, "carts", currentUser.uid), {
      items: cart,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Erreur sauvegarde panier:", err);
  }
}

// ===== FIRESTORE : COMMANDES =====
async function loadOrders(uid) {
  try {
    const q    = query(collection(db, "orders"), where("userId", "==", uid), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateStats();
    displayOrders();
  } catch (err) {
    console.error("Erreur chargement commandes:", err);
  }
}

async function saveOrder(orderData) {
  try {
    const ref = await addDoc(collection(db, "orders"), {
      ...orderData,
      userId:    currentUser.uid,
      createdAt: serverTimestamp(),
      status:    "pending"
    });
    return ref.id;
  } catch (err) {
    console.error("Erreur sauvegarde commande:", err);
    throw err;
  }
}

// ===== PRODUCTS =====
function displayProducts() {
  const grid = document.getElementById('productsGrid');
  if (filteredProducts.length === 0) {
    grid.innerHTML = '<div class="no-results" style="grid-column: 1 / -1;"><i class="fas fa-search" style="font-size: 3rem; opacity: 0.5; display: block; margin-bottom: 1rem;"></i><h3>Aucun produit trouvé</h3></div>';
    document.getElementById('resultsCount').textContent = '0';
    return;
  }

  document.getElementById('resultsCount').textContent = filteredProducts.length;
  grid.innerHTML = filteredProducts.map(p => `
    <div class="product-card">
      <img src="${p.image}" alt="${p.name}" class="product-image">
      <div class="product-info">
        <div class="product-brand">${p.brand.toUpperCase()}</div>
        <h3 class="product-title">${p.name}</h3>
        <div class="product-specs">${p.specs}</div>
        <div class="product-price">${p.price.toLocaleString()} FCFA</div>
        <button class="add-to-cart" onclick="addToCart(${p.id}, '${p.name}', ${p.price}, '${p.image}')">
          <i class="fas fa-cart-plus"></i> Ajouter
        </button>
      </div>
    </div>
  `).join('');
}

function filterProducts() {
  const search   = document.getElementById('searchInput').value.toLowerCase();
  const brands   = Array.from(document.querySelectorAll('input[id^="brand-"]:checked')).map(el => el.value);
  const types    = Array.from(document.querySelectorAll('input[id^="type-"]:checked')).map(el => el.value);
  const priceMin = parseInt(document.getElementById('priceMin').value) || 0;
  const priceMax = parseInt(document.getElementById('priceMax').value) || Infinity;

  filteredProducts = allProducts.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search) || p.brand.toLowerCase().includes(search);
    const matchBrand  = brands.length === 0 || brands.includes(p.brand);
    const matchType   = types.length  === 0 || types.includes(p.type);
    const matchPrice  = p.price >= priceMin && p.price <= priceMax;
    return matchSearch && matchBrand && matchType && matchPrice;
  });

  displayProducts();
}

function sortProducts() {
  const sort = document.getElementById('sortSelect').value;
  if (sort === 'price-asc')  filteredProducts.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') filteredProducts.sort((a, b) => b.price - a.price);
  else if (sort === 'name-asc')   filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'name-desc')  filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
  displayProducts();
}

function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
  document.getElementById('priceMin').value  = '';
  document.getElementById('priceMax').value  = '';
  document.getElementById('sortSelect').value = '';
  filteredProducts = [...allProducts];
  displayProducts();
}

// ===== CART =====
async function addToCart(id, name, price, image) {
  if (!currentUser) {
    openProfileModal();
    return;
  }

  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, name, price, image, qty: 1 });
  }

  await saveCart();
  updateCartCount();
  showToast(`${name} ajouté au panier! 🛒`);
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  document.getElementById('cartCount').textContent = count;
}

function updateCartUI() {
  const list     = document.getElementById('cartItemsList');
  const emptyMsg = document.getElementById('cartEmptyMsg');

  if (cart.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
    document.getElementById('subtotal').textContent   = '0 FCFA';
    document.getElementById('shipping').textContent   = '0 FCFA';
    document.getElementById('totalPrice').textContent = '0 FCFA';
    return;
  }

  emptyMsg.style.display = 'none';
  let subtotal = 0;

  list.innerHTML = cart.map((item, index) => {
    subtotal += item.price * item.qty;
    return `
      <div class="cart-item">
        <img src="${item.image}" class="cart-item-img">
        <div class="cart-item-details">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${item.price.toLocaleString()} FCFA</div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="changeQty(${index}, -1)">−</button>
            <span>${item.qty}</span>
            <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
          </div>
        </div>
        <button onclick="removeFromCart(${index})" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:1.2rem;padding:0;">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
  }).join('');

  const shipping = subtotal > 100000 ? 0 : 2000;
  const total    = subtotal + shipping;
  document.getElementById('subtotal').textContent   = subtotal.toLocaleString() + ' FCFA';
  document.getElementById('shipping').textContent   = shipping.toLocaleString() + ' FCFA';
  document.getElementById('totalPrice').textContent = total.toLocaleString() + ' FCFA';
}

async function changeQty(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) {
    await removeFromCart(index);
  } else {
    await saveCart();
    updateCartCount();
    updateCartUI();
  }
}

async function removeFromCart(index) {
  cart.splice(index, 1);
  await saveCart();
  updateCartCount();
  updateCartUI();
}

function openCartModal() {
  if (!currentUser) {
    openProfileModal();
    return;
  }
  updateCartUI();
  document.getElementById('cartModal').classList.add('active');
  document.getElementById('overlay').classList.add('active');
}

function closeCartModal() {
  document.getElementById('cartModal').classList.remove('active');
  if (!document.getElementById('profileModal').classList.contains('active')) {
    document.getElementById('overlay').classList.remove('active');
  }
}

async function placeOrder() {
  if (cart.length === 0) { alert('Panier vide'); return; }

  const name    = document.getElementById('customerName').value.trim();
  const phone   = document.getElementById('customerPhone').value.trim();
  const address = document.getElementById('customerAddress').value.trim();

  if (!name || !phone || !address) { alert('Remplissez tous les champs'); return; }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shipping = subtotal > 100000 ? 0 : 2000;
  const total    = subtotal + shipping;

  const orderData = {
    items:    cart.map(item => ({ name: item.name, qty: item.qty, price: item.price })),
    total,
    customer: { name, phone, address }
  };

  try {
    // ✅ Sauvegarder la commande dans Firestore
    await saveOrder(orderData);

    // ✅ Message WhatsApp
    let message = `*COMMANDE MOBILESHOP PRO*%0A%0A`;
    message += `*Client:* ${name}%0A*Téléphone:* ${phone}%0A*Adresse:* ${address}%0A%0A`;
    message += `*PRODUITS:*%0A`;
    cart.forEach(item => {
      message += `➤ ${item.name} x${item.qty} = ${(item.price * item.qty).toLocaleString()} FCFA%0A`;
    });
    message += `%0A*Sous-total:* ${subtotal.toLocaleString()} FCFA%0A*Livraison:* ${shipping.toLocaleString()} FCFA%0A*TOTAL:* ${total.toLocaleString()} FCFA`;

    // ✅ Vider le panier dans Firestore
    cart = [];
    await saveCart();
    updateCartCount();
    closeCartModal();

    await loadOrders(currentUser.uid);
    showToast('Commande placée avec succès! 🎉');

    // ✅ Redirection WhatsApp directe
    window.location.href = `https://wa.me/221${phone.replace(/\s/g, '')}?text=${message}`;

  } catch (err) {
    alert("❌ Erreur lors de la commande : " + err.message);
  }
}

// ===== FIREBASE AUTH =====
async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    document.getElementById('loginForm').reset();
    closeProfileModal();
    showToast('Connecté avec succès! ✅');
  } catch (err) {
    showAuthError(getAuthErrorMessage(err.code));
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name     = document.getElementById('registerName').value.trim();
  const email    = document.getElementById('registerEmail').value.trim();
  const phone    = document.getElementById('registerPhone').value.trim();
  const password = document.getElementById('registerPassword').value;

  try {
    // 1. Créer le compte Firebase Auth
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // 2. Mettre à jour le displayName
    await fbUpdateProfile(cred.user, { displayName: name });

    // 3. Sauvegarder le profil dans Firestore
    await saveUserProfile(cred.user.uid, { name, email, phone, createdAt: new Date().toISOString() });

    document.getElementById('registerForm').reset();
    closeProfileModal();
    showToast('Compte créé avec succès! 🎉');
  } catch (err) {
    showAuthError(getAuthErrorMessage(err.code));
  }
}

async function logout() {
  try {
    await signOut(auth);
    closeProfileModal();
    showToast('Déconnecté');
  } catch (err) {
    console.error("Erreur déconnexion:", err);
  }
}

async function updateProfile() {
  if (!currentUser) return;
  const name  = document.getElementById('settingsName').value.trim();
  const email = document.getElementById('settingsEmail').value.trim();
  const phone = document.getElementById('settingsPhone').value.trim();

  try {
    await fbUpdateProfile(currentUser, { displayName: name });
    await saveUserProfile(currentUser.uid, { name, email, phone });
    showProfileContent();
    showToast('Profil mis à jour! ✅');
  } catch (err) {
    showToast('Erreur mise à jour: ' + err.message);
  }
}

function showProfileContent() {
  const profile = currentProfile || {};
  const name    = profile.name || currentUser?.displayName || 'Utilisateur';
  const email   = profile.email || currentUser?.email || '';
  const phone   = profile.phone || '';

  document.getElementById('userDisplay').textContent = name.split(' ')[0];
  document.getElementById('authContent').style.display    = 'none';
  document.getElementById('profileContent').style.display = 'block';
  document.getElementById('profileName').textContent  = name;
  document.getElementById('profileEmail').textContent = email;
  document.getElementById('settingsName').value  = name;
  document.getElementById('settingsEmail').value = email;
  document.getElementById('settingsPhone').value = phone;
  updateStats();
  displayOrders();
}

function updateStats() {
  document.getElementById('totalOrders').textContent = orders.length;
  const total = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  document.getElementById('totalAmount').textContent = total.toLocaleString() + ' FCFA';
}

function displayOrders() {
  const list = document.getElementById('ordersList');
  if (orders.length === 0) {
    list.innerHTML = '<p style="color:#94a3b8;text-align:center;">Aucune commande</p>';
    return;
  }

  list.innerHTML = orders.map(o => {
    const dateStr = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString('fr-FR') : new Date(o.createdAt || Date.now()).toLocaleDateString('fr-FR');
    return `
      <div class="order-card">
        <div class="order-header">
          <div class="order-id">Commande #${o.id.toString().slice(-6)}</div>
          <span class="order-status ${o.status === 'completed' ? 'status-completed' : 'status-pending'}">
            ${o.status === 'completed' ? '✓ Livrée' : '⏳ En cours'}
          </span>
        </div>
        <div class="order-date">${dateStr}</div>
        <div class="order-items">${(o.items || []).length} article(s)</div>
        <div class="order-total">${(o.total || 0).toLocaleString()} FCFA</div>
      </div>
    `;
  }).join('');
}

// ===== MODALS =====
function openProfileModal() {
  document.getElementById('profileModal').classList.add('active');
  document.getElementById('overlay').classList.add('active');
}

function closeProfileModal() {
  document.getElementById('profileModal').classList.remove('active');
  if (!document.getElementById('cartModal').classList.contains('active')) {
    document.getElementById('overlay').classList.remove('active');
  }
}

function closeAllModals() {
  closeCartModal();
  closeProfileModal();
}

function switchToRegister(e) {
  e.preventDefault();
  document.getElementById('loginForm').style.display    = 'none';
  document.getElementById('registerForm').style.display = 'block';
}

function switchToLogin(e) {
  e.preventDefault();
  document.getElementById('loginForm').style.display    = 'block';
  document.getElementById('registerForm').style.display = 'none';
}

function switchTab(e, tabName) {
  e.preventDefault();
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tabName).classList.add('active');
  e.target.classList.add('active');
}

// ===== UI UTILS =====
function showAuthError(msg) {
  const errorEl = document.getElementById('authError');
  errorEl.textContent   = msg;
  errorEl.style.display = 'block';
  setTimeout(() => errorEl.style.display = 'none', 4000);
}

function getAuthErrorMessage(code) {
  const messages = {
    'auth/user-not-found':      'Aucun compte avec cet email',
    'auth/wrong-password':      'Mot de passe incorrect',
    'auth/email-already-in-use':'Email déjà utilisé',
    'auth/weak-password':       'Mot de passe trop court (6 caractères min)',
    'auth/invalid-email':       'Email invalide',
    'auth/invalid-credential':  'Email ou mot de passe incorrect',
    'auth/too-many-requests':   'Trop de tentatives. Réessayez plus tard'
  };
  return messages[code] || 'Une erreur est survenue';
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    z-index: 9999;
    font-family: inherit;
    font-size: 14px;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function toggleMobileMenu() {
  const navLinks = document.querySelector('.nav-links');
  navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
}

function scrollToHome() {
  document.getElementById('home').scrollIntoView({ behavior: 'smooth' });
}

// ===== THEME =====
function toggleTheme() {
  const theme = document.getElementById("themeStylesheet");
  if (theme.getAttribute("href") === "styles.css") {
    theme.setAttribute("href", "styles-light.css");
    localStorage.setItem("theme", "light");
  } else {
    theme.setAttribute("href", "styles.css");
    localStorage.setItem("theme", "dark");
  }
}

function loadTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    document.getElementById("themeStylesheet").setAttribute("href", "styles-light.css");
  }
}

// ===== START =====
window.addEventListener('DOMContentLoaded', init);

// Exposer les fonctions au HTML (nécessaire avec les modules ES)
window.filterProducts   = filterProducts;
window.sortProducts     = sortProducts;
window.resetFilters     = resetFilters;
window.addToCart        = addToCart;
window.changeQty        = changeQty;
window.removeFromCart   = removeFromCart;
window.openCartModal    = openCartModal;
window.closeCartModal   = closeCartModal;
window.placeOrder       = placeOrder;
window.openProfileModal = openProfileModal;
window.closeProfileModal= closeProfileModal;
window.closeAllModals   = closeAllModals;
window.handleLogin      = handleLogin;
window.handleRegister   = handleRegister;
window.logout           = logout;
window.updateProfile    = updateProfile;
window.switchToRegister = switchToRegister;
window.switchToLogin    = switchToLogin;
window.switchTab        = switchTab;
window.toggleTheme      = toggleTheme;
window.scrollToHome     = scrollToHome;
window.toggleMobileMenu = toggleMobileMenu;