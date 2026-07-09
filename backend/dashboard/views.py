from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from dashboard.services.stats_service import (
    get_dashboard_overview,
    get_dashboard_summary,
    get_live_stats,
    get_position_rankings,
)


class DashboardSummaryView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        election_id = request.query_params.get("election_id")
        election_id = int(election_id) if election_id else None
        academic_year = request.query_params.get("academic_year")
        data = get_dashboard_summary(election_id, academic_year=academic_year)
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)


class DashboardOverviewView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        election_id = request.query_params.get("election_id")
        election_id = int(election_id) if election_id else None
        academic_year = request.query_params.get("academic_year")
        data = get_dashboard_overview(election_id, academic_year=academic_year)
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)


class LiveStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        election_id = request.query_params.get("election_id")
        election_id = int(election_id) if election_id else None
        academic_year = request.query_params.get("academic_year")
        data = get_live_stats(election_id, academic_year=academic_year)
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)


class PositionRankingsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, position_id):
        election_id = request.query_params.get("election_id")
        election_id = int(election_id) if election_id else None
        data = get_position_rankings(position_id, election_id)
        if data is None:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "not_found",
                        "message": "Election or position not found.",
                        "details": None,
                    },
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)
