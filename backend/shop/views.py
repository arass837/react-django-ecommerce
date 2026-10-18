from django.db import models
from django.conf import settings
from decimal import Decimal

from django.db import transaction
from django.db.models import F

from rest_framework import generics, permissions, serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import (
    Category,
    Product,
    Order,
    OrderItem,
    ShippingMethod,
    ShippingAddress,
)

from .serializers import (
    CategorySerializer,
    ProductSerializer,
    RegisterSerializer,
    OrderSerializer,
    CheckoutSerializer,
    ShippingMethodSerializer,
    ShippingAddressSerializer,
)


# ============================================================
# KATEGORIE PRODUKTÓW
# ============================================================

class CategoryList(generics.ListAPIView):

    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


# ============================================================
# LISTA PRODUKTÓW
# ============================================================

class ProductList(generics.ListAPIView):

    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):

        queryset = (
            Product.objects
            .filter(active=True)
            .select_related("category")
            .order_by("id")
        )

        category_id = self.request.query_params.get("category")

        if category_id:
            queryset = queryset.filter(category_id=category_id)

        return queryset


# ============================================================
# SZCZEGÓŁY PRODUKTU
# ============================================================

class ProductDetail(generics.RetrieveAPIView):

    queryset = (
        Product.objects
        .filter(active=True)
        .select_related("category")
    )

    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]


# ============================================================
# REJESTRACJA UŻYTKOWNIKA
# ============================================================

class Register(generics.CreateAPIView):

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


# ============================================================
# HISTORIA ZAMÓWIEŃ UŻYTKOWNIKA
# ============================================================

class MyOrders(generics.ListAPIView):

    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):

        return (
            Order.objects
            .filter(user=self.request.user)
            .select_related("shipping_method")
            .prefetch_related("items__product")
            .order_by("-id")
        )


# ============================================================
# DOSTĘPNE METODY DOSTAWY
# ============================================================

class ShippingMethodList(generics.ListAPIView):

    serializer_class = ShippingMethodSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):

        return (
            ShippingMethod.objects
            .filter(
                active=True,
                carrier__active=True
            )
            .select_related("carrier")
            .order_by("carrier__name", "price")
        )


# ============================================================
# LISTA I DODAWANIE ADRESÓW DOSTAWY
# ============================================================

class ShippingAddressListCreate(generics.ListCreateAPIView):

    serializer_class = ShippingAddressSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):

        return (
            ShippingAddress.objects
            .filter(user=self.request.user)
            .order_by("-is_default", "id")
        )

    @transaction.atomic
    def perform_create(self, serializer):

        # Przypisanie adresu do zalogowanego użytkownika
        address = serializer.save(
            user=self.request.user
        )

        # Wyłączenie innych adresów domyślnych
        if address.is_default:

            ShippingAddress.objects.filter(
                user=self.request.user
            ).exclude(
                pk=address.pk
            ).update(
                is_default=False
            )


# ============================================================
# SZCZEGÓŁY, EDYCJA I USUWANIE ADRESU
# ============================================================

class ShippingAddressDetail(
    generics.RetrieveUpdateDestroyAPIView
):

    serializer_class = ShippingAddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):

        # Użytkownik może zarządzać wyłącznie własnymi adresami
        return ShippingAddress.objects.filter(
            user=self.request.user
        )

    @transaction.atomic
    def perform_update(self, serializer):

        address = serializer.save()

        # Jeden adres domyślny na użytkownika
        if address.is_default:

            ShippingAddress.objects.filter(
                user=self.request.user
            ).exclude(
                pk=address.pk
            ).update(
                is_default=False
            )


# ============================================================
# SKŁADANIE ZAMÓWIENIA
# ============================================================

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def checkout(request):

    # --------------------------------------------------------
    # 1. SPRAWDZENIE WYBRANEGO ADRESU
    # --------------------------------------------------------

    payload = request.data.copy()

    address_id = payload.get("shipping_address_id")

    if address_id is not None:

        try:
            address = ShippingAddress.objects.get(
                pk=address_id,
                user=request.user
            )

        except (
            ShippingAddress.DoesNotExist,
            ValueError,
            TypeError,
        ):
            return Response(
                {
                    "detail": "Nie znaleziono wybranego adresu."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Kopiujemy aktualne dane adresu do zamówienia
        # Późniejsza edycja adresu nie zmieni historii

        shipping_address = (
            f"{address.full_name}\n"
            f"{address.street} {address.house_number}"
        )

        if address.apartment_number:
            shipping_address += f"/{address.apartment_number}"

        shipping_address += (
            f"\n{address.postal_code} {address.city}"
            f"\nTelefon: {address.phone}"
        )

        payload["shipping_address"] = shipping_address

    # --------------------------------------------------------
    # 2. WALIDACJA DANYCH ZAMÓWIENIA
    # --------------------------------------------------------

    serializer = CheckoutSerializer(data=payload)
    serializer.is_valid(raise_exception=True)

    data = serializer.validated_data

    items = data["items"]

    # --------------------------------------------------------
    # 3. WALIDACJA METODY DOSTAWY
    # --------------------------------------------------------

    shipping_method_id = request.data.get(
        "shipping_method_id"
    )

    if not shipping_method_id:
        return Response(
            {
                "detail": "Select a shipping method."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        shipping_method_id = int(shipping_method_id)

        if shipping_method_id < 1:
            raise ValueError()

    except (ValueError, TypeError):
        return Response(
            {
                "detail": "Invalid shipping method."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    pickup_point = request.data.get("pickup_point", "")

    if not isinstance(pickup_point, str):
        return Response(
            {
                "detail": "Invalid pickup point."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    pickup_point = pickup_point.strip()

    if len(pickup_point) > 150:
        return Response(
            {
                "detail": "Pickup point code is too long."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # --------------------------------------------------------
    # 4. TRANSAKCJA BAZODANOWA
    # --------------------------------------------------------

    with transaction.atomic():

        shipping_method = (
            ShippingMethod.objects
            .select_for_update()
            .select_related("carrier")
            .filter(
                pk=shipping_method_id,
                active=True,
                carrier__active=True
            )
            .first()
        )

        if shipping_method is None:
            raise serializers.ValidationError({
                "shipping_method_id":
                    "Selected shipping method is unavailable."
            })

        # Automat i punkt odbioru wymagają kodu punktu
        if shipping_method.delivery_type in ("locker", "pickup"):

            if not pickup_point:
                raise serializers.ValidationError({
                    "pickup_point":
                        "Podaj kod automatu lub punktu odbioru."
                })

        else:
            pickup_point = ""

        # ----------------------------------------------------
        # 5. POBRANIE PRODUKTÓW Z BLOKADĄ MAGAZYNU
        # ----------------------------------------------------

        product_ids = [
            item["product_id"]
            for item in items
        ]

        products = {
            product.id: product
            for product in (
                Product.objects
                .select_for_update()
                .filter(
                    id__in=product_ids,
                    active=True
                )
                .order_by("id")
            )
        }

        if len(products) != len(set(product_ids)):
            raise serializers.ValidationError({
                "items":
                    "Some products are no longer available."
            })

        # ----------------------------------------------------
        # 6. SPRAWDZENIE STANÓW MAGAZYNOWYCH
        # ----------------------------------------------------

        for item in items:

            product = products[item["product_id"]]
            quantity = item["quantity"]

            if product.stock < quantity:
                raise serializers.ValidationError({
                    "items":
                        f"Insufficient stock: "
                        f"{product.name}. "
                        f"Available: {product.stock} pcs."
                })

        # ----------------------------------------------------
        # 7. OBLICZANIE WARTOŚCI PRODUKTÓW
        # ----------------------------------------------------

        products_total = Decimal("0.00")

        for item in items:

            product = products[item["product_id"]]
            quantity = item["quantity"]

            products_total += product.price * quantity

        # Koszt dostawy pochodzi wyłącznie z Django
        shipping_cost = shipping_method.price

        order_total = products_total + shipping_cost

        # ----------------------------------------------------
        # 8. UTWORZENIE ZAMÓWIENIA
        # ----------------------------------------------------

        order = Order.objects.create(
            user=request.user,
            shipping_address=data["shipping_address"],
            shipping_method=shipping_method,
            shipping_cost=shipping_cost,
            pickup_point=pickup_point,
            total=order_total,
            status="new"
        )

        # ----------------------------------------------------
        # 9. ZAPIS POZYCJI ZAMÓWIENIA
        # ----------------------------------------------------

        order_items = []

        for item in items:

            product = products[item["product_id"]]

            order_items.append(
                OrderItem(
                    order=order,
                    product=product,
                    quantity=item["quantity"],
                    unit_price=product.price
                )
            )

        OrderItem.objects.bulk_create(order_items)

        # ----------------------------------------------------
        # 10. AKTUALIZACJA MAGAZYNU
        # ----------------------------------------------------

        for item in items:

            Product.objects.filter(
                pk=item["product_id"]
            ).update(
                stock=F("stock") - item["quantity"]
            )

    # --------------------------------------------------------
    # 11. ODPOWIEDŹ API
    # --------------------------------------------------------

    order = (
        Order.objects
        .select_related("shipping_method")
        .prefetch_related("items__product")
        .get(pk=order.pk)
    )

    return Response(
        OrderSerializer(order).data,
        status=status.HTTP_201_CREATED
    )
