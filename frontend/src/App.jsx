
import React, { useEffect, useState } from "react";
import DeliveryPage from "./DeliveryPage";
import {
  Link,
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";

import api from "./api";
import { enText } from "./translations";


// ============================================================
// FORMATOWANIE CEN
// ============================================================

const pln = (value) =>
  Number(value).toLocaleString("en-GB", {
    style: "currency",
    currency: "PLN",
  });


// ============================================================
// GŁÓWNY KOMPONENT APLIKACJI
// ============================================================

function App() {

  const [cart, setCart] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("cart") || "[]");
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });


  const [token, setToken] = useState(() =>
    localStorage.getItem("access")
  );


  // Zapisywanie koszyka w localStorage
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);


  // Dodawanie do koszyka z informacją dla kupującego
  const add = (product) => {
    const stock = Number(product.stock);
    const existing = cart.find((item) => String(item.id) === String(product.id));

    if (!Number.isFinite(stock) || stock < 1) {
      return { ok: false, message: `Product “${enText(product.name)}” is unavailable.` };
    }

    if (existing && Number(existing.quantity) >= stock) {
      return { ok: false, message: `Maximum available quantity: ${stock}.` };
    }

    setCart((previous) => {
      const current = previous.find((item) => String(item.id) === String(product.id));
      if (current) {
        return previous.map((item) =>
          String(item.id) === String(product.id)
            ? { ...item, stock, quantity: Math.min(Number(item.quantity) + 1, stock) }
            : item
        );
      }
      return [...previous, { ...product, quantity: 1 }];
    });

    return { ok: true, message: `Added to cart: ${enText(product.name)}` };
  };


  // Usuwanie produktu z koszyka
  const remove = (id) => {
    setCart((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };


  // Zmiana ilości produktu
  const change = (id, quantity) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: Math.max(
                1,
                Math.min(item.stock, quantity || 1)
              ),
            }
          : item
      )
    );
  };


  // Wylogowanie użytkownika
  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");

    setToken(null);
  };


  // Liczba produktów w koszyku
  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );


  return (
    <>
      {/* NAGŁÓWEK */}

      <header>
        <Link className="logo" to="/">
          NOVA <span>STORE</span>
        </Link>

        <nav>
          <Link to="/">Products</Link>

          <Link to="/cart">
            Cart ({cartCount})
          </Link>

          {token ? (
            <>
              <Link to="/orders">
                Orders
              </Link>

              <button onClick={logout}>
                Sign Out
              </button>
            </>
          ) : (
            <Link to="/login">
              Sign In
            </Link>
          )}
        </nav>
      </header>


      {/* GŁÓWNA ZAWARTOŚĆ */}

      <main>
        <Routes>

          <Route
            path="/"
            element={<Catalog add={add} />}
          />

          <Route
            path="/product/:id"
            element={<ProductDetail add={add} />}
          />

          <Route
            path="/cart"
            element={
              <Cart
                cart={cart}
                change={change}
                remove={remove}
                clear={() => setCart([])}
                token={token}
              />
            }
          />

          <Route
            path="/login"
            element={
              <Auth
                register={false}
                onLogin={setToken}
              />
            }
          />

          <Route
            path="/register"
            element={
              <Auth
                register={true}
                onLogin={setToken}
              />
            }
          />



           <Route
              path="/delivery"
              element={
              <DeliveryPage
              cart={cart}
              clear={() => setCart([])}
              token={token}
              />
              }
              />   



          <Route
            path="/orders"
            element={<Orders token={token} />}
          />

        </Routes>
      </main>


      {/* STOPKA */}

      <footer>
        Demo project • React + Django REST Framework
        • No real payments
      </footer>
    </>
  );
}


// A separate confirmation for each product. It disappears after 2.5 seconds
// and is automatically removed when the user navigates away.
function AddToCartButton({ product, add }) {
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!feedback) return;
    const timeoutId = window.setTimeout(() => setFeedback(null), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const handleAdd = () => {
    const result = add(product);
    setFeedback(result);
  };

  return (
    <div className="product-add-control">
      <button
        type="button"
        disabled={Number(product.stock) <= 0}
        onClick={handleAdd}
      >
        {Number(product.stock) <= 0 ? "Out of Stock" : "Add to Cart"}
      </button>
      {feedback && (
        <span
          className={`product-add-feedback ${feedback.ok ? "is-success" : "is-error"}`}
          role="status"
        >
          {feedback.ok ? "✓ " : ""}{feedback.message}
        </span>
      )}
    </div>
  );
}


// ============================================================
// KATALOG PRODUKTÓW
// ============================================================

function Catalog({ add }) {

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");


  // Pobieranie kategorii
  useEffect(() => {
    api.get("categories/")
      .then((response) => {
        setCategories(response.data);
      })
      .catch(() => {});
  }, []);


  // Pobieranie produktów
  useEffect(() => {
    api.get("products/", {
      params: category ? { category } : {},
    })
      .then((response) => {
        setProducts(
          response.data.results || response.data
        );

        setError("");
      })
      .catch(() => {
        setError(
          "Cannot connect to Django. " +
          "Start the backend on port 8000."
        );
      });
  }, [category]);


  return (
    <>

      {/* BANER SKLEPU */}

      <section className="hero">
        <p>REACT + DJANGO E-COMMERCE</p>

        <h1>Your Online Store</h1>

        <span>
          Products, shopping cart, orders, and customer accounts
          — a full-stack demo application.
        </span>
      </section>


      {/* FILTROWANIE PRODUKTÓW */}

      <div className="toolbar">
        <h2>Products</h2>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">
            All categories
          </option>

          {categories.map((item) => (
            <option
              key={item.id}
              value={item.id}
            >
              {enText(item.name)}
            </option>
          ))}
        </select>
      </div>


      {/* KOMUNIKAT BŁĘDU */}

      {error && (
        <p className="error">{error}</p>
      )}


      {/* LISTA PRODUKTÓW */}

      <div className="grid">

        {products.map((product) => (

          <article
            className="product"
            key={product.id}
          >

            <div className="product-art">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={enText(product.name)}
                />
              ) : (
                <span>◈</span>
              )}
            </div>

            <small>
              {product.category_name}
            </small>

            <h3>
              <Link to={`/product/${product.id}`}>
                {enText(product.name)}
              </Link>
            </h3>

            <p>{enText(product.description)}</p>

            <div className="bottom">
              <strong>
                {pln(product.price)}
              </strong>

              <AddToCartButton product={product} add={add} />
            </div>

          </article>
        ))}

      </div>
    </>
  );
}


// ============================================================
// SZCZEGÓŁY PRODUKTU
// ============================================================

function ProductDetail({ add }) {

  const { id } = useParams();

  const [product, setProduct] = useState(null);


  useEffect(() => {
    api.get(`products/${id}/`)
      .then((response) => {
        setProduct(response.data);
      })
      .catch(() => {});
  }, [id]);


  if (!product) {
    return (
      <p>Loading product or product not found...</p>
    );
  }


  return (
    <div className="panel">

      <Link to="/">
        ← Back to store
      </Link>

      <h1>{enText(product.name)}</h1>

      <p>{enText(product.description)}</p>

      <p>
        Kategoria: {product.category_name}
      </p>

      <h2>{pln(product.price)}</h2>

      <p>
        In stock: {product.stock}
      </p>

      <AddToCartButton product={product} add={add} />

    </div>
  );
}


// ============================================================
// KOSZYK I SKŁADANIE ZAMÓWIENIA
// ============================================================

function Cart({ cart, change, remove, clear, token }) {
  const navigate = useNavigate();
  const productsTotal = cart.reduce(
    (sum, product) => sum + Number(product.price) * product.quantity, 0
  );

  if (cart.length === 0) {
    return (
      <div className="panel">
        <h1>Your Cart</h1>
        <p>Your cart is empty.</p>
      </div>
    );
  }

  return (
    <div className="cart-layout">
      {/* LEWA KOLUMNA */}
      <div className="cart-main">
        <div className="cart-box">
          <div className="cart-box-header">
            <label className="cart-check">
              <input type="checkbox" checked readOnly />
              <span>entire cart</span>
            </label>

            <button
              className="cart-remove-all"
              onClick={clear}
              type="button"
            >
              REMOVE
            </button>
          </div>
        </div>

        <div className="cart-box">
          <div className="cart-seller-header">
            <label className="cart-check">
              <input type="checkbox" checked readOnly />
              <span>Shipment from NOVA STORE</span>
            </label>
          </div>

          {cart.map((product) => (
            <div className="cart-item" key={product.id}>
              <label className="cart-check cart-item-check">
                <input type="checkbox" checked readOnly />
              </label>

              <div className="cart-item-image">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={enText(product.name)}
                  />
                ) : (
                  <div className="cart-item-placeholder">◈</div>
                )}
              </div>

              <div className="cart-item-info">
                <h3>{enText(product.name)}</h3>
                <p>{enText(product.description)}</p>
              </div>

              <div className="cart-qty">
                <button
                  type="button"
                  onClick={() =>
                    change(product.id, product.quantity - 1)
                  }
                >
                  −
                </button>

                <input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={product.quantity}
                  onChange={(e) =>
                    change(product.id, Number(e.target.value))
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    change(product.id, product.quantity + 1)
                  }
                >
                  +
                </button>
              </div>

              <div className="cart-price">
                {pln(product.price * product.quantity)}
              </div>

              <button
                className="cart-delete"
                onClick={() => remove(product.id)}
                type="button"
                title="Remove product"
              >
                🗑
              </button>
            </div>
          ))}

          <div className="cart-delivery-info">
            <p>Choose a delivery method at the next step.</p>
          </div>
        </div>

      </div>

      {/* PRAWA KOLUMNA */}
      <aside className="cart-summary">
        <div className="cart-summary-box">
          <div className="summary-row">
            <span>Products subtotal</span>
            <strong>{pln(productsTotal)}</strong>
          </div>

          <div className="summary-row">
            <span>Shipping</span>
            <strong>Not selected</strong>
          </div>

          <hr />

          <div className="summary-total">
            <span>Cart total excluding shipping</span>
            <strong>{pln(productsTotal)}</strong>
          </div>



         <button
            className="summary-btn summary-btn-primary"
            type="button"
            onClick={() => token ? navigate("/delivery") : navigate("/login", { state: { returnTo: "/delivery" } })}
            >
            DELIVERY & PAYMENT
            </button>

          <button
            className="summary-link-btn"
            type="button"
            onClick={() => navigate("/")}
          >
            CONTINUE SHOPPING
          </button>
        </div>
      </aside>
    </div>
  );
}


// ============================================================
// LOGOWANIE I REJESTRACJA
// ============================================================

function Auth({ register, onLogin }) {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();


  // Obsługa logowania lub rejestracji
  async function submit(e) {
    e.preventDefault();

    setError("");

    try {

      // Rejestracja nowego użytkownika
      if (register) {
        await api.post("auth/register/", {
          username,
          password,
          email,
        });
      }


      // Sign In użytkownika
      const response = await api.post("auth/login/", {
        username,
        password,
      });


      // Zapisywanie tokenów JWT
      localStorage.setItem(
        "access",
        response.data.access
      );

      localStorage.setItem(
        "refresh",
        response.data.refresh
      );


      // Aktualizacja stanu logowania
      onLogin(response.data.access);


      // Przekierowanie do sklepu
      navigate(location.state?.returnTo || "/");

    } catch (error) {
      setError(
        JSON.stringify(
          error.response?.data || "Connection error"
        )
      );
    }
  }


  return (
    <div className="panel auth">

      <h1>
        {register
          ? "Create an Account"
          : "Sign In"}
      </h1>


      <form onSubmit={submit}>

        {/* LOGIN */}

        <label>
          Login

          <input
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            required
          />
        </label>


        {/* E-MAIL TYLKO PRZY REJESTRACJI */}

        {register && (
          <label>
            E-mail

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />
          </label>
        )}


        {/* HASŁO */}

        <label>
          Password

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
            minLength={register ? 8 : undefined}
          />
        </label>


        {/* PRZYCISK */}

        <button type="submit">
          {register
            ? "Register"
            : "Sign In"}
        </button>

      </form>


      {/* BŁĘDY */}

      {error && (
        <p className="error">
          {error}
        </p>
      )}


      {/* NAWIGACJA */}

      <p>
        {register ? (

          <Link to="/login">
            I already have an account
          </Link>

        ) : (

          <Link to="/register">
            Create a new account
          </Link>

        )}
      </p>

    </div>
  );
}


// ============================================================
// HISTORIA ZAMÓWIEŃ
// ============================================================

function Orders({ token }) {
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");


  // Pobieranie zamówień użytkownika
  useEffect(() => {

    if (token) {
      api.get("orders/")
        .then((response) => {
          setOrders(
            response.data.results || response.data
          );
        })
        .catch(() => {
          setError(
            "Unable to load orders"
          );
        });
    }

  }, [token]);


  // Out of stock zalogowanego użytkownika
  if (!token) {
    return (
      <p>
        <Link to="/login">
          Sign In
        </Link>
         to view your orders.
      </p>
    );
  }


  return (
    <div className="panel">

      <h1>My Orders</h1>
      {location.state?.orderCreated && (
        <p className="notice" role="status">
          Order #{location.state.orderCreated} has been saved. No payment was taken (demo mode).
        </p>
      )}

      {error && (
        <p className="error">
          {error}
        </p>
      )}


      {orders.length === 0 ? (

        <p>No orders yet.</p>

      ) : (

        orders.map((order) => (

          <div
            className="order"
            key={order.id}
          >

            <h3>
              Order #{order.id}
              {" — "}
              {pln(order.total)}
            </h3>

            <small>
              {new Date(
                order.created_at
              ).toLocaleString("en-GB")}
              {" • "}
              {order.status}
            </small>


            {/* PRODUKTY W ZAMÓWIENIU */}

            {order.items.map((item, index) => (

              <p key={index}>
                {enText(item.product_name)}
                {" × "}
                {item.quantity}
              </p>

            ))}

          </div>

        ))

      )}

    </div>
  );
}


// ============================================================
// EKSPORT GŁÓWNEGO KOMPONENTU
// ============================================================

export default App;
