
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
// DOSTĘPNE METODY PŁATNOŚCI - DEMO
// ============================================================

const PAYMENT_METHODS = [
  {
    id: "card",
    name: "Credit / Debit Card",
    symbol: "💳",
    description: "Visa / Mastercard",
  },
  {
    id: "google_pay",
    name: "Google Pay",
    symbol: "G Pay",
    description: "Google Wallet",
  },
  {
    id: "apple_pay",
    name: "Apple Pay",
    symbol: " Pay",
    description: "Apple Wallet",
  },
  {
    id: "blik",
    name: "BLIK",
    symbol: "blik",
    description: "BLIK payment",
  },
  {
    id: "visa_mobile",
    name: "Visa Mobile",
    symbol: "VISA",
    description: "Mobile payment",
  },
  {
    id: "transfer",
    name: "Bank Transfer",
    symbol: "🏦",
    description: "Traditional bank transfer",
  },
];


const DELIVERY_GROUPS = [
  {
    id: "pickup",
    title: "Pickup Point",
    description: "Parcel lockers and pickup locations",
    types: ["locker", "pickup"],
  },
  {
    id: "courier",
    title: "Home Delivery",
    description: "Courier delivery to your address",
    types: ["courier"],
  },
];

// ============================================================
// STRONA DOSTAWY I PŁATNOŚCI
// ============================================================

function DeliveryPage({ cart = [], token, clear }) {
  const navigate = useNavigate();

  // ----------------------------------------------------------
  // DOSTAWA
  // ----------------------------------------------------------

  const [shippingMethods, setShippingMethods] = useState([]);
  const [selectedShippingId, setSelectedShippingId] = useState("");
  const [deliveryGroup, setDeliveryGroup] = useState("pickup");
  const [shippingLoading, setShippingLoading] = useState(true);
  const [shippingError, setShippingError] = useState("");
  const [pickupPoint, setPickupPoint] = useState("");

  const emptyAddress = {
    name: "", full_name: "", street: "", house_number: "",
    apartment_number: "", postal_code: "", city: "", phone: "",
    is_default: false,
  };
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState(null);


  // ----------------------------------------------------------
  // PŁATNOŚĆ
  // ----------------------------------------------------------

  const [selectedPayment, setSelectedPayment] = useState("blik");
  const [message, setMessage] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState(null);

  // ----------------------------------------------------------
  // POBIERANIE METOD DOSTAWY Z DJANGO
  // ----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function fetchShippingMethods() {
      try {
        const response = await api.get("shipping-methods/");

        if (cancelled) return;

        const methods = Array.isArray(response.data)
          ? response.data
          : response.data.results || [];

        setShippingMethods(methods);
        setShippingError("");
      } catch (error) {
        if (cancelled) return;

        console.error("Błąd pobierania dostaw:", error);

        setShippingError(
          "Unable to load delivery methods."
        );
      } finally {
        if (!cancelled) {
          setShippingLoading(false);
        }
      }
    }

    fetchShippingMethods();

    return () => {
      cancelled = true;
    };
  }, []);


  // Adresy przechowywane są w Django, przypisane do zalogowanego konta.
  useEffect(() => {
    let cancelled = false;
    setAddresses([]);
    setSelectedAddressId(null);
    setAddressError("");
    setShowAddressForm(false);
    setEditingAddressId(null);
    if (!token) {
      setAddressLoading(false);
      return () => { cancelled = true; };
    }
    setAddressLoading(true);
    api.get("shipping-addresses/")
      .then(({ data }) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data?.results ?? []);
        setAddresses(list);
        setSelectedAddressId(list.find(a => a.is_default)?.id ?? list[0]?.id ?? null);
      })
      .catch(error => {
        if (!cancelled) {
          console.error("Błąd pobierania adresów:", error);
          setAddressError("Unable to load saved addresses.");
        }
      })
      .finally(() => { if (!cancelled) setAddressLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  function openNewAddress() {
    if (!token) { navigate("/login"); return; }
    setEditingAddressId(null);
    setAddressForm({ name: "", full_name: "", street: "", house_number: "",
      apartment_number: "", postal_code: "", city: "", phone: "",
      is_default: false });
    setAddressError("");
    setShowAddressForm(true);
  }

  function openEditAddress(address) {
    setEditingAddressId(address.id);
    setAddressForm({
      name: address.name, full_name: address.full_name,
      street: address.street, house_number: address.house_number,
      apartment_number: address.apartment_number ?? "",
      postal_code: address.postal_code, city: address.city,
      phone: address.phone, is_default: address.is_default,
    });
    setAddressError("");
    setShowAddressForm(true);
  }

  function changeAddressField(event) {
    const { name, value, type, checked } = event.target;
    setAddressForm(previous => ({
      ...previous, [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function saveAddress(event) {
    event.preventDefault();
    if (savingAddress) return;
    setAddressError("");
    setSavingAddress(true);
    try {
      const { data } = editingAddressId
        ? await api.patch(`shipping-addresses/${editingAddressId}/`, addressForm)
        : await api.post("shipping-addresses/", addressForm);
      setAddresses(previous => {
        const updated = editingAddressId
          ? previous.map(a => a.id === data.id ? data : a)
          : [...previous, data];
        return data.is_default
          ? updated.map(a => ({ ...a, is_default: a.id === data.id }))
          : updated;
      });
      setSelectedAddressId(data.id);
      setShowAddressForm(false);
      setEditingAddressId(null);
      setMessage("");
    } catch (error) {
      console.error("Błąd zapisywania adresu:", error);
      const details = error.response?.data;
      setAddressError(details?.postal_code?.[0] || details?.detail ||
        "Unable to save address. Check required fields.");
    } finally {
      setSavingAddress(false);
    }
  }

  async function removeAddress(id) {
    if (deletingAddressId !== null) return;
    if (!window.confirm("Delete this delivery address?")) return;
    setDeletingAddressId(id);
    setAddressError("");
    try {
      await api.delete(`shipping-addresses/${id}/`);
      const remaining = addresses.filter(a => a.id !== id);
      setAddresses(remaining);
      if (String(selectedAddressId) === String(id)) {
        setSelectedAddressId(remaining.find(a => a.is_default)?.id ?? remaining[0]?.id ?? null);
      }
      if (editingAddressId === id) setShowAddressForm(false);
    } catch (error) {
      console.error("Błąd usuwania adresu:", error);
      setAddressError("Unable to delete address.");
    } finally {
      setDeletingAddressId(null);
    }
  }

  // ============================================================
  // OBLICZENIA KOSZYKA
  // ============================================================

  const productsTotal = cart.reduce(
    (sum, product) =>
      sum + Number(product.price) * product.quantity,
    0
  );

  const productCount = cart.reduce(
    (sum, product) => sum + product.quantity,
    0
  );


const currentGroup = DELIVERY_GROUPS.find(
  (group) => group.id === deliveryGroup
);

const availableMethods = shippingMethods.filter(
  (method) =>
    currentGroup.types.includes(method.delivery_type)
);

const selectedShipping = availableMethods.find(
  (method) =>
    String(method.id) === selectedShippingId
);


  const shippingCost = selectedShipping
    ? Number(selectedShipping.price)
    : 0;

  const total = productsTotal + shippingCost;

  const selectedPaymentMethod = PAYMENT_METHODS.find(
    (method) => method.id === selectedPayment
  );


  // ============================================================
  // OBSŁUGA PRZYCISKU PŁATNOŚCI - DEMO
  // ============================================================

  async function handlePayment() {
    if (placingOrder || placedOrderId !== null) return;
    setMessage("");

    if (!token) {
      navigate("/login");
      return;
    }
    if (cart.length === 0) {
      setMessage("Your cart is empty.");
      return;
    }
    if (!selectedShipping) {
      setMessage("Choose a shipping or pickup method.");
      return;
    }
    const selectedAddress = addresses.find(
      (a) => String(a.id) === String(selectedAddressId)
    );
    if (!selectedAddress) {
      setMessage("Select a saved recipient address or add a new one.");
      return;
    }
    if (deliveryGroup === "pickup" && !pickupPoint.trim()) {
      setMessage("Enter the parcel locker or pickup point code.");
      return;
    }

    setPlacingOrder(true);
    try {
      const payload = {
        shipping_address_id: Number(selectedAddress.id),
        shipping_method_id: Number(selectedShipping.id),
        pickup_point: deliveryGroup === "pickup" ? pickupPoint.trim() : "",
        items: cart.map((product) => ({
          product_id: Number(product.id),
          quantity: Number(product.quantity),
        })),
      };

      // To jest zapis zamówienia, NIE pobranie płatności.
      const { data } = await api.post("checkout/", payload);
      setPlacedOrderId(data.id);
      if (typeof clear === "function") clear();
      setMessage(`Order #${data.id} was saved in Django. Status: new, unpaid. Selected payment method: ${selectedPaymentMethod?.name ?? "none"} (demo).`);
    } catch (error) {
      console.error("Błąd tworzenia zamówienia:", error);
      const details = error.response?.data;
      const description = typeof details === "string"
        ? details
        : details?.detail || details?.non_field_errors?.[0] ||
          (details ? JSON.stringify(details) : "Check your Django connection.");
      setMessage(`Unable to save order: ${description}`);
    } finally {
      setPlacingOrder(false);
    }
  }

  // ============================================================
  // WIDOK
  // ============================================================

  return (
    <div className="delivery-page">

      <h1>Delivery & Payment</h1>

      <Link to="/cart">
        ← Back to Cart
      </Link>


      <div className="delivery-layout">

        {/* =====================================================
            LEWA KOLUMNA
        ===================================================== */}

        <div className="delivery-content">


          {/* ===================================================
              1. WYBÓR SPOSOBU DOSTAWY
          =================================================== */}

          <section className="delivery-section">

            <h2 className="delivery-section-title">
              Choose a Delivery Method
            </h2>

            <div className="delivery-section-body">
              
{/* WYBÓR RODZAJU DOSTAWY */}

<div className="delivery-type-switch">

  {DELIVERY_GROUPS.map((group) => (

    <label
      key={group.id}
      className={
        "delivery-type-option " +
        (deliveryGroup === group.id
          ? "delivery-type-active"
          : "")
      }
    >

      <input
        type="radio"
        name="deliveryGroup"
        value={group.id}
        checked={deliveryGroup === group.id}
        onChange={() => {
          setDeliveryGroup(group.id);
          setSelectedShippingId("");
          setMessage("");
        }}
      />

      <span>
        <strong>{group.title}</strong>
        <small>{group.description}</small>
      </span>

    </label>

  ))}

</div>


              {shippingLoading && (
                <p>Loading delivery methods...</p>
              )}

              {shippingError && (
                <p className="error">
                  {shippingError}
                </p>
              )}

              {!shippingLoading &&
                !shippingError &&
                shippingMethods.length === 0 && (
                  <p>No delivery methods available.</p>
                )}

              <div className="shipping-methods">

                {availableMethods.map((method) => (

                  <label
                    key={method.id}
                    className={
                      "shipping-option " +
                      (selectedShippingId === String(method.id)
                        ? "shipping-option-selected"
                        : "")
                    }
                  >

                    <input
                      type="radio"
                      name="shippingMethod"
                      value={method.id}
                      checked={
                        selectedShippingId === String(method.id)
                      }
                      onChange={() => {
                        setSelectedShippingId(String(method.id));
                        setMessage("");
                      }}
                    />

                    <div className="shipping-option-info">
                      <strong>{method.carrier_name}</strong>
                      <span>{method.name}</span>
                      <small>{method.delivery_type_label}</small>
                    </div>

                    <strong className="shipping-option-price">
                      {pln(method.price)}
                    </strong>

                  </label>

                ))}

              </div>

              {deliveryGroup === "pickup" && (
                <div className="pickup-point-box" style={{ marginTop: 20 }}>
                  <label htmlFor="pickup-point-code"><strong>Pickup Point Code</strong></label>
                  <input
                    id="pickup-point-code" type="text" value={pickupPoint}
                    onChange={e => setPickupPoint(e.target.value)}
                    placeholder="e.g. parcel locker or pickup location code" maxLength={150}
                    style={{ display: "block", width: "100%", marginTop: 8, padding: 12 }}
                  />
                </div>
              )}

              {(deliveryGroup === "courier" || deliveryGroup === "pickup") && (
                <div className="delivery-address-box">
                  <h3>{deliveryGroup === "courier" ? "Shipping Address" : "Recipient Details"}</h3>
                  {deliveryGroup === "pickup" && <p className="delivery-muted">Recipient address and phone number are also required for pickup orders.</p>}
                  {!token && <p>Sign in to save and select an address.</p>}
                  {addressLoading && <p>Loading addresses...</p>}
                  {!addressLoading && token && addresses.length === 0 && (
                    <p>You do not have any saved shipping addresses yet.</p>
                  )}
                  <div className="saved-addresses">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className={
                          "saved-address-option " +
                          (String(selectedAddressId) === String(address.id)
                            ? "saved-address-selected"
                            : "")
                        }
                      >
                        <label className="saved-address-main">
                          <input
                            className="saved-address-checkbox"
                            type="checkbox"
                            checked={String(selectedAddressId) === String(address.id)}
                            onChange={() => {
                              setSelectedAddressId(address.id);
                              setMessage("");
                            }}
                          />
                          <span className="saved-address-details">
                            <span className="saved-address-heading">
                              <strong>{address.name}</strong>
                              {address.is_default && (
                                <span className="saved-address-default">Default</span>
                              )}
                            </span>
                            <strong className="saved-address-person">{address.full_name}</strong>
                            <span>
                              {address.street} {address.house_number}
                              {address.apartment_number ? `/${address.apartment_number}` : ""}
                            </span>
                            <span>{address.postal_code} {address.city}</span>
                            <span>Tel. {address.phone}</span>
                          </span>
                        </label>
                        <div className="saved-address-actions">
                          <button type="button" onClick={() => openEditAddress(address)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={deletingAddressId !== null}
                            onClick={() => removeAddress(address.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!showAddressForm && (
                    <button type="button" className="add-address-button" onClick={openNewAddress}>
                      + Add Shipping Address
                    </button>
                  )}
                  {showAddressForm && (
                    <form className="delivery-address-form" onSubmit={saveAddress}>
                      <h4>{editingAddressId ? "Edit Address" : "Add New Address"}</h4>
                      <input name="name" placeholder="Address name (e.g. Home)"
                        value={addressForm.name} onChange={changeAddressField} required />
                      <input name="full_name" placeholder="Full name"
                        value={addressForm.full_name} onChange={changeAddressField} required />
                      <input name="street" placeholder="Street"
                        value={addressForm.street} onChange={changeAddressField} required />
                      <div className="delivery-address-row">
                        <input name="house_number" placeholder="House number"
                          value={addressForm.house_number} onChange={changeAddressField} required />
                        <input name="apartment_number" placeholder="Apartment number (optional)"
                          value={addressForm.apartment_number} onChange={changeAddressField} />
                      </div>
                      <div className="delivery-address-row">
                        <input name="postal_code" placeholder="Postal code 00-000"
                          value={addressForm.postal_code} onChange={changeAddressField}
                          pattern="[0-9]{2}-[0-9]{3}" maxLength={6} required />
                        <input name="city" placeholder="City"
                          value={addressForm.city} onChange={changeAddressField} required />
                      </div>
                      <input name="phone" type="tel" placeholder="Contact phone number"
                        value={addressForm.phone} onChange={changeAddressField} required />
                      <label className="address-default-label">
                        <input type="checkbox" name="is_default"
                          checked={addressForm.is_default} onChange={changeAddressField} />
                        Set as default address
                      </label>
                      <div className="address-form-actions">
                        <button type="submit" disabled={savingAddress}>
                          {savingAddress ? "Saving..." : "Save Address"}
                        </button>
                        <button type="button" onClick={() => setShowAddressForm(false)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                  {addressError && <p className="error" role="alert">{addressError}</p>}
                </div>
              )}

            </div>

          </section>


          {/* ===================================================
              2. PRODUKTY W ZAMÓWIENIU
          =================================================== */}

          <section className="delivery-section">

            <h2 className="delivery-section-title">
              Items in Your Order
            </h2>

            <div className="delivery-section-body">

              <div className="shipment-title">

                <span>
                  Number of items: {productCount}
                </span>

                <strong>{pln(productsTotal)}</strong>

              </div>

              <div className="shipment-products">

                {cart.map((product) => (

                  <div
                    className="shipment-product"
                    key={product.id}
                  >

                    <div className="shipment-image">

                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={enText(product.name)}
                        />
                      ) : (
                        <span>◈</span>
                      )}

                    </div>

                    <div className="shipment-info">

                      <Link to={`/product/${product.id}`}>
                        {enText(product.name)}
                      </Link>

                      <small>
                        {product.quantity} × {pln(product.price)}
                      </small>

                    </div>

                    <strong className="shipment-price">
                      {pln(
                        Number(product.price) * product.quantity
                      )}
                    </strong>

                  </div>

                ))}

              </div>

              <div className="shipment-delivery">

                <span>
                  {selectedShipping
                    ? `${selectedShipping.carrier_name} – ${selectedShipping.name}`
                    : "No delivery method selected"}
                </span>

                <strong>
                  {selectedShipping
                    ? pln(shippingCost)
                    : "—"}
                </strong>

              </div>

            </div>

          </section>


          {/* ===================================================
              3. METODY PŁATNOŚCI
          =================================================== */}

          <section className="delivery-section payment-section">

            <h2 className="delivery-section-title">
              Payment
            </h2>

            <div className="delivery-section-body">

              <div className="payment-information">
                <span className="payment-gift-icon">🎁</span>

                <div>
                  <strong>
                    Choose Your Payment Method
                  </strong>

                  <p>
                    The available payment options are shown
                    for demonstration only. They do not process
                    real transactions.
                  </p>
                </div>
              </div>

              <div
                className="payment-methods"
                role="radiogroup"
                aria-label="Select payment method"
              >

                {PAYMENT_METHODS.map((method) => (

                  <label
                    key={method.id}
                    className={
                      "payment-option " +
                      (selectedPayment === method.id
                        ? "payment-option-selected"
                        : "")
                    }
                  >

                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={selectedPayment === method.id}
                      onChange={() => {
                        setSelectedPayment(method.id);
                        setMessage("");
                      }}
                    />

                    <span
                      className={
                        "payment-option-logo " +
                        `payment-logo-${method.id}`
                      }
                      aria-hidden="true"
                    >
                      {method.symbol}
                    </span>

                    <div className="payment-option-info">
                      <strong>{method.name}</strong>
                      <small>{method.description}</small>
                    </div>

                    <span
                      className={
                        "payment-radio-indicator " +
                        (selectedPayment === method.id
                          ? "payment-radio-active"
                          : "")
                      }
                      aria-hidden="true"
                    />

                  </label>

                ))}

              </div>

              <p className="payment-demo-note">
                Demo mode — selecting a payment method
                does not contact a bank or payment gateway
                or charge any card.
              </p>

            </div>

          </section>

        </div>


        {/* =====================================================
            PRAWA KOLUMNA - PODSUMOWANIE
        ===================================================== */}

        <aside className="delivery-summary">

          <h2>Order Summary</h2>

          <div className="delivery-summary-body">

            <div className="delivery-summary-row">
              <span>Products subtotal</span>
              <span>{pln(productsTotal)}</span>
            </div>

            <div className="delivery-summary-row">
              <span>Shipping</span>

              <span>
                {selectedShipping
                  ? pln(shippingCost)
                  : "Select delivery"}
              </span>
            </div>

            <div className="delivery-summary-total">
              <strong>Total</strong>

              <strong>
                {selectedShipping
                  ? pln(total)
                  : "—"}
              </strong>
            </div>

            <button
              className="delivery-pay-button"
              type="button"
              disabled={!selectedShipping || cart.length === 0 || placingOrder || placedOrderId !== null}
              onClick={handlePayment}
            >
              {placingOrder ? "SAVING ORDER..." : placedOrderId !== null ? "ORDER SAVED" : "PLACE ORDER"}
            </button>

            <p className="delivery-payment-note">
              Selected method: {selectedPaymentMethod.name} (demo).
              Placing an order saves it in Django but does not collect payment.
            </p>

            {message && (
              <p className="payment-result" role="status">{message}</p>
            )}
            {placedOrderId !== null && (
              <Link to="/orders" className="delivery-orders-link">View My Orders →</Link>
            )}

          </div>

        </aside>

      </div>

    </div>
  );
}


// ============================================================
// EKSPORT KOMPONENTU
// ============================================================

export default DeliveryPage;
