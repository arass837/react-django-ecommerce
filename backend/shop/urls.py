
from django.urls import path

from .views import (
    CategoryList,
    ProductList,
    ProductDetail,
    Register,
    MyOrders,
    ShippingMethodList,
    ShippingAddressListCreate,
    ShippingAddressDetail,
    checkout,
)


urlpatterns = [

    # ========================================================
    # KATEGORIE
    # ========================================================

    path(
        "categories/",
        CategoryList.as_view(),
        name="category-list"
    ),

    # ========================================================
    # PRODUKTY
    # ========================================================

    path(
        "products/",
        ProductList.as_view(),
        name="product-list"
    ),

    path(
        "products/<int:pk>/",
        ProductDetail.as_view(),
        name="product-detail"
    ),

    # ========================================================
    # REJESTRACJA UŻYTKOWNIKÓW
    # ========================================================

    path(
        "auth/register/",
        Register.as_view(),
        name="register"
    ),

    # ========================================================
    # ZAMÓWIENIA
    # ========================================================

    path(
        "orders/",
        MyOrders.as_view(),
        name="my-orders"
    ),

    path(
        "checkout/",
        checkout,
        name="checkout"
    ),

    # ========================================================
    # METODY DOSTAWY
    # ========================================================

    path(
        "shipping-methods/",
        ShippingMethodList.as_view(),
        name="shipping-methods"
    ),

    # ========================================================
    # ADRESY DOSTAWY UŻYTKOWNIKA
    # ========================================================

    path(
        "shipping-addresses/",
        ShippingAddressListCreate.as_view(),
        name="shipping-address-list"
    ),

    path(
        "shipping-addresses/<int:pk>/",
        ShippingAddressDetail.as_view(),
        name="shipping-address-detail"
    ),

]
