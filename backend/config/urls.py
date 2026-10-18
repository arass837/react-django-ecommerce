
from django.contrib import admin
from django.urls import path, include

from django.conf import settings
from django.conf.urls.static import static

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


# ============================================================
# ADRESY URL APLIKACJI
# ============================================================

urlpatterns = [

    # Panel administracyjny Django
    path(
        "admin/",
        admin.site.urls
    ),

    # API sklepu
    path(
        "api/",
        include("shop.urls")
    ),

    # Logowanie JWT
    path(
        "api/auth/login/",
        TokenObtainPairView.as_view(),
        name="token_obtain_pair"
    ),

    # Odświeżanie tokenu JWT
    path(
        "api/auth/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh"
    ),

]


# ============================================================
# OBSŁUGA ZDJĘĆ PRODUKTÓW
# ============================================================

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )
