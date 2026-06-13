from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .serializers import TripInputSerializer
from .planner import plan_trip
from .routing import RoutingError
from .models import Trip


@api_view(["GET"])
def health(request):
    return Response({"status": "ok", "service": "eld-trip-planner"})


@api_view(["POST"])
def plan_trip_view(request):
    """Validate inputs, compute the route + HOS plan + daily logs, and persist it."""
    serializer = TripInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    try:
        result = plan_trip(
            current_location=data["current_location"],
            pickup_location=data["pickup_location"],
            dropoff_location=data["dropoff_location"],
            current_cycle_used=data["current_cycle_used"],
            start_date=data.get("start_date"),
        )
    except RoutingError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:  # pragma: no cover - defensive guard for the demo
        return Response(
            {"detail": f"Unexpected error while planning the trip: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        Trip.objects.create(
            current_location=data["current_location"],
            pickup_location=data["pickup_location"],
            dropoff_location=data["dropoff_location"],
            current_cycle_used=data["current_cycle_used"],
            start_date=data.get("start_date"),
            total_distance_miles=result["summary"]["total_distance_miles"],
            total_drive_hours=result["summary"]["total_drive_hours"],
            num_days=result["summary"]["num_days"],
            plan=result,
        )
    except Exception:
        # Persistence is a convenience; never fail the request because of it.
        pass

    return Response(result, status=status.HTTP_200_OK)
