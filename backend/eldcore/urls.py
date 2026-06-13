"""URL configuration for the eldcore project."""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def root(request):
    return JsonResponse({
        "service": "ELD Trip Planner API",
        "endpoints": {
            "health": "/api/health/",
            "plan_trip": "/api/plan-trip/ (POST)",
        },
    })


urlpatterns = [
    path("", root),
    path("admin/", admin.site.urls),
    path("api/", include("trips.urls")),
]
